import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { environment } from "@raycast/api";

const execFileAsync = promisify(execFile);
const XCRUN_PATH = "/usr/bin/xcrun";

/**
 * Grid tiles render around 128pt, so 256px covers 2x displays without paying for
 * the 512px and 1024px representations we'd only downscale again.
 */
export const CACHE_ICON_SIZE = 256;

/** Extracting every app at once is one `xcrun swift` launch; chunking only adds launches. */
const CACHE_DIR = path.join(environment.supportPath, "icon-cache");

/**
 * Prefix for in-flight extraction temp files. Shared by the extractor below and
 * `pruneIconCache` so the two can't drift: prune must never delete a temp file another
 * window is still writing.
 */
const TEMP_PREFIX = ".tmp-";

/**
 * How long a superseded cache entry is left alone before `pruneIconCache` collects it.
 *
 * Long enough that any grid window still displaying it has had a chance to re-resolve,
 * short enough that the extra disk is a rounding error — a few dozen 43KB PNGs at worst,
 * and only for apps that changed within the window.
 */
const SUPERSEDED_GRACE_MS = 15 * 60 * 1000;

/**
 * `NSWorkspace.icon(forFile:)` returns an image whose *nominal* size is 32pt even
 * though it carries representations up to 2048px. Raycast's `fileIcon` renders that
 * nominal size, so a grid tile upscales 32pt to ~128pt and looks soft. Drawing the
 * icon into an explicitly-sized bitmap forces the high-resolution representation.
 *
 * Reads one `appPath outPath` job per line from stdin, both base64, so a whole fleet
 * costs one process launch — the per-icon work is ~20ms against ~1s per `xcrun swift`
 * launch, which is why this is batched rather than called per app.
 */
const EXTRACTOR_SWIFT = `
import AppKit
let s = ${CACHE_ICON_SIZE}
while let line = readLine() {
  // Each field is base64 so a path containing a tab or newline can't forge an extra
  // record. Anything that doesn't decode is skipped rather than guessed at.
  // EXACTLY ONE line is printed per input line, on every path, so the caller's progress
  // count matches the jobs it sent.
  let fields = line.components(separatedBy: " ")
  guard fields.count >= 2,
        let inData = Data(base64Encoded: fields[0]),
        let outData = Data(base64Encoded: fields[1]),
        let appPath = String(data: inData, encoding: .utf8),
        let outPath = String(data: outData, encoding: .utf8)
  else {
    print("fail")
    fflush(stdout)
    continue
  }
  let icon = NSWorkspace.shared.icon(forFile: appPath)
  icon.size = NSSize(width: s, height: s)
  guard let bmp = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: s, pixelsHigh: s, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)
  else {
    print("fail")
    fflush(stdout)
    continue
  }
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bmp)
  icon.draw(in: NSRect(x: 0, y: 0, width: s, height: s), from: .zero, operation: .copy, fraction: 1.0)
  NSGraphicsContext.restoreGraphicsState()
  // Write to a sibling temp file, then put it in place, so a failed or partial write
  // never leaves a half-PNG for the grid to render.
  //
  // The two cases are spelled out separately on purpose. A cache MISS (no destination
  // yet) is the common path on first run — it's a plain move. Only a cache REPLACE has
  // an existing file to swap, which is what replaceItemAt is for.
  var wrote = false
  if let data = bmp.representation(using: .png, properties: [:]) {
    let fm = FileManager.default
    let finalURL = URL(fileURLWithPath: outPath)
    let tmpURL = finalURL.deletingLastPathComponent()
      .appendingPathComponent("${TEMP_PREFIX}" + UUID().uuidString)
    do {
      try data.write(to: tmpURL, options: .atomic)
      // No timestamp is applied. The destination filename encodes the source state this
      // bitmap was drawn from, so an entry's identity no longer depends on its mtime and
      // there is nothing for a wall-clock write to misrepresent.
      if fm.fileExists(atPath: finalURL.path) {
        _ = try fm.replaceItemAt(finalURL, withItemAt: tmpURL)
      } else {
        try fm.moveItem(at: tmpURL, to: finalURL)
      }
      wrote = true
    } catch {
      try? fm.removeItem(at: tmpURL)
    }
  }
  // One line per icon, flushed immediately, so the caller can count progress as it
  // happens. "fail" is reported honestly rather than counted as a success.
  print(wrote ? "done" : "fail")
  fflush(stdout)
}
`;

/**
 * Stable per-app prefix, from a hash of the full bundle path.
 *
 * Hashing rather than sanitizing: replacing every non-alphanumeric character with
 * `_` collapses `A-B.app` and `A_B.app` onto one filename, so the two apps would
 * share a cache entry and one grid tile would show the other's icon. It also keeps
 * the name short, which sanitizing a deep path does not.
 *
 * The prefix is what makes an entry attributable to an app without opening it, which
 * `invalidateCachedIcon` and `pruneIconCache` both need — the rest of the filename
 * encodes source state and is not derivable from the path alone.
 */
function appPrefix(appPath: string): string {
  return createHash("sha256").update(appPath).digest("hex").slice(0, 32);
}

/**
 * The paths whose mtimes decide whether a cached icon is still current.
 *
 * Every path here covers a change the others miss, so dropping one silently stops
 * detecting a real kind of icon update:
 *
 * - The **bundle root** misses in-place updates entirely — an updater rewriting files
 *   inside the bundle leaves the root's mtime untouched.
 * - **`Contents`** and **`Resources`** move when an entry is added, replaced, or removed,
 *   but not when an existing file's bytes are overwritten.
 * - The **icon payloads** cover exactly that case. `AppIcon.icns` and `Assets.car` are the
 *   conventional names; `CFBundleIconFile` may name anything, and roughly half of installed
 *   apps do (Visual Studio Code's is `Code.icns`), so the declared name is sampled too.
 * - **`Info.plist`** both names the icon and changes on most updates.
 *
 * The declared name is read from `Info.plist` directly rather than by spawning `plutil`
 * per app per grid visit. A binary plist yields nothing and falls back to the conventional
 * names plus the directory stamps.
 */
async function iconStampPaths(appPath: string): Promise<string[]> {
  const resources = path.join(appPath, "Contents", "Resources");
  const declared = await declaredIconFile(appPath);
  // A Set rather than a conditional push: when the declared name IS one of the
  // conventional ones, listing it twice would hash its state twice for no gain.
  return [
    ...new Set([
      appPath,
      path.join(appPath, "Contents"),
      path.join(appPath, "Contents", "Info.plist"),
      resources,
      path.join(resources, "AppIcon.icns"),
      path.join(resources, "Assets.car"),
      ...(declared ? [path.join(resources, declared)] : []),
    ]),
  ];
}

/**
 * The `CFBundleIconFile` value, normalised to a filename, or null when it can't be read.
 *
 * XML plists are matched textually; a binary plist yields null. Returning nothing is always
 * safe — the conventional names and directory stamps still cover the app — whereas a WRONG
 * name is not, because it hashes into the cache key and would stamp a file that does not
 * exist, hiding real changes to the one that does.
 *
 * So the text is decoded the way a plist parser would (the five predefined XML entities),
 * and anything still ambiguous afterwards is refused rather than guessed at: a stray `&`
 * means an entity this doesn't know, and a path separator means the value isn't a plain
 * filename. `.icns` is appended when omitted, which is the documented shorthand.
 */
const XML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/** One source for both the decode and the "did anything unknown survive?" check. */
const XML_ENTITY_PATTERN = new RegExp(`&(${Object.keys(XML_ENTITIES).join("|")});`, "g");

async function declaredIconFile(appPath: string): Promise<string | null> {
  try {
    const plist = await readFile(path.join(appPath, "Contents", "Info.plist"), "utf8");
    // Strip comments first: a commented-out key would otherwise be read as live.
    const raw = plist
      .replace(/<!--[\s\S]*?-->/g, "")
      .match(/<key>CFBundleIconFile<\/key>\s*<string>([^<]*)<\/string>/)?.[1];
    if (raw === undefined) return null;
    // Judge the RAW text: an `&` left after the known entities are stripped is one this
    // doesn't decode (numeric, or DTD-defined), so the value can't be trusted. Testing the
    // decoded string instead would reject `&amp;`, which decodes perfectly well.
    if (raw.replace(XML_ENTITY_PATTERN, "").includes("&")) return null;
    const name = raw.replace(XML_ENTITY_PATTERN, (_, entity) => XML_ENTITIES[entity]).trim();
    if (!name || /[\\/]/.test(name)) return null;
    return name.endsWith(".icns") ? name : `${name}.icns`;
  } catch {
    return null;
  }
}

/**
 * The observed state of one stamp path, rendered for hashing.
 *
 * Three cases, kept distinct because collapsing any two of them was a real bug:
 *
 * - **Readable** contributes its mtime.
 * - **Absent** (`ENOENT`/`ENOTDIR`) is the ordinary shape of an Asset Catalog app with no
 *   `.icns`, so it must be a stable, benign value rather than evidence of change.
 * - **Unreadable** (`EACCES`, I/O error) is *no information*. It gets its own token so a
 *   blind observation can never produce the same key as a readable one — which is what
 *   forces exactly one redraw on entering the blind state and another on recovery.
 */
async function stampState(target: string): Promise<string> {
  try {
    return String((await stat(target)).mtimeMs);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code === "ENOENT" || code === "ENOTDIR" ? "absent" : "unreadable";
  }
}

/**
 * The cache filename for an app *in its currently observed source state*.
 *
 * This is the whole freshness mechanism. The filename encodes what was observed, so
 * "is the cache fresh?" collapses to "does this exact file exist?" — one `stat`, and no
 * comparison whose operands could be read at different moments.
 *
 * Hash the full ordered vector, not a `max()`: a maximum discards which path moved, and
 * goes *backwards* when the newest stamp disappears.
 *
 * Two entries for the same app differ only after the `-`, so `appPrefix` still attributes
 * any entry to its app without opening it.
 */
async function cacheKey(appPath: string): Promise<string> {
  const states = await Promise.all((await iconStampPaths(appPath)).map(stampState));
  // The app path is already in the prefix; including it here too binds the state digest to
  // this app, so two apps with coincidentally identical state vectors can't share a name.
  const digest = createHash("sha256")
    .update(`${CACHE_ICON_SIZE}\u0000${appPath}\u0000${states.join("\u0000")}`)
    .digest("hex")
    .slice(0, 32);
  return `${appPrefix(appPath)}-${digest}.png`;
}

/** Where an app's icon lives *right now*, given what its sources currently look like. */
async function currentEntryPath(appPath: string): Promise<string> {
  return path.join(CACHE_DIR, await cacheKey(appPath));
}

/** An app paired with the cache file for its current source state. */
type ResolvedEntry = {
  appPath: string;
  entryPath: string;
  /** Whether that file is already on disk — a hit needs no work, a miss must be drawn. */
  cached: boolean;
};

/**
 * Resolve every app to its current entry and note whether it exists.
 *
 * The one place that turns "what do these apps look like now?" into paths on disk. Both
 * callers below are views of this: extraction wants the misses, the grid wants the hits.
 */
async function resolveEntries(appPaths: readonly string[]): Promise<ResolvedEntry[]> {
  return Promise.all(
    appPaths.map(async (appPath) => {
      const entryPath = await currentEntryPath(appPath);
      const cached = await stat(entryPath).then(
        () => true,
        () => false,
      );
      return { appPath, entryPath, cached };
    }),
  );
}

/**
 * The apps whose icon must be (re)drawn, each paired with the file to write.
 *
 * An entry is named for the source state it was drawn from, so changed sources hash to a
 * name nothing has written (a miss), unchanged sources hash to the one already there, and
 * a deleted entry is a miss by definition.
 *
 * An unreadable source needs no special case: it hashes to its own token, so entering that
 * state redraws once, staying in it redraws nothing, and recovery redraws once more from
 * the readable state.
 */
async function findStaleApps(appPaths: readonly string[]): Promise<ResolvedEntry[]> {
  return (await resolveEntries(appPaths)).filter((entry) => !entry.cached);
}

/**
 * Bring the cache up to date, extracting only what's missing or outdated.
 * Resolves to the number of icons extracted (0 when the cache was already warm).
 *
 * Errors are the caller's to report: a failed extraction leaves the grid on its
 * `fileIcon` fallback, which is soft but never blank.
 */
export async function refreshIconCache(
  appPaths: readonly string[],
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<number> {
  await mkdir(CACHE_DIR, { recursive: true });

  const stale = await findStaleApps(appPaths);
  if (stale.length === 0) return 0;

  // Both awaits above can outlast the view. Adding a listener to an already-aborted signal
  // never fires — the event does not replay — so without this check a grid closed during
  // `mkdir` or the stale resolve would still launch the extractor and run the whole batch
  // for nobody.
  if (signal?.aborted) return 0;

  const encode = (value: string) => Buffer.from(value, "utf8").toString("base64");
  // Two fields: the app to draw, and exactly where to write it. Pixels drawn from an older
  // state land under that state's name, which nothing subsequently asks for, so the job
  // needs to carry no freshness information of its own.
  const jobs = stale.map(({ appPath, entryPath }) => `${encode(appPath)} ${encode(entryPath)}`).join("\n");

  onProgress?.(0, stale.length);

  // The script comes in via `-e` so stdin stays free for the job list, and each field
  // is base64 so no path can forge a record separator.
  const child = execFileAsync(XCRUN_PATH, ["swift", "-e", EXTRACTOR_SWIFT], { maxBuffer: 1024 * 1024 });
  // Abandoning the grid shouldn't leave a Swift process extracting icons nobody is
  // waiting for.
  const abort = () => child.child.kill();
  signal?.addEventListener("abort", abort, { once: true });
  child.child.stdin?.end(jobs);

  // The extractor prints one line per icon. Counting them as they arrive is what makes
  // the toast a live counter rather than a spinner that lies about state. Only "done"
  // counts — a failed write must not inflate progress.
  //
  // Only the count is used, not which job a line belongs to — a miscount would misreport
  // progress, never mislabel an entry.
  let done = 0;
  let pending = "";
  child.child.stdout?.on("data", (chunk: Buffer) => {
    // Chunks can split mid-line, so hold the remainder until its newline arrives.
    pending += chunk.toString();
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    done += lines.filter((line) => line === "done").length;
    onProgress?.(Math.min(done, stale.length), stale.length);
  });

  try {
    await child;
  } finally {
    signal?.removeEventListener("abort", abort);
  }

  // Report what actually succeeded. Claiming `stale.length` here would paper over a
  // batch where some writes failed.
  onProgress?.(done, stale.length);
  return done;
}

/**
 * The cache entry to render for each app that has one, keyed by app path.
 *
 * A Map rather than a Set because the filename is no longer derivable from the app path —
 * it encodes observed source state, so only a resolver that has *looked* can name it. The
 * grid renders exactly what this returns, which is also what keeps the rendered path and
 * the freshness decision from being computed at two different moments against sources that
 * may have moved in between.
 */
export async function listCachedApps(appPaths: readonly string[]): Promise<ReadonlyMap<string, string>> {
  const resolved = await resolveEntries(appPaths);
  return new Map(resolved.filter((entry) => entry.cached).map(({ appPath, entryPath }) => [appPath, entryPath]));
}

/**
 * Drop every cached entry for one app so the next grid visit re-extracts it.
 *
 * Called after an export, which is the one moment we know the user has deliberately
 * touched this app — and exports read the live bundle, never the cache.
 *
 * Every entry for the app is removed, not just the one matching the current source state.
 * The point of invalidating is to discard what we believe about this icon, and an entry
 * written under some earlier state would otherwise be waiting to be re-adopted the moment
 * the sources looked that way again. The `appPrefix` is what makes that sweep possible
 * without opening anything.
 */
export async function invalidateCachedIcon(appPath: string): Promise<void> {
  const prefix = `${appPrefix(appPath)}-`;
  try {
    const entries = await readdir(CACHE_DIR);
    await Promise.all(
      entries
        .filter((entry) => entry.startsWith(prefix))
        .map((entry) => unlink(path.join(CACHE_DIR, entry)).catch(() => {})),
    );
  } catch {
    // No cache directory yet — nothing to invalidate.
  }
}

/**
 * Drop cache entries nothing will ask for again: uninstalled apps, and superseded states
 * of installed ones.
 *
 * State-addressed names mint a new entry whenever an app's icon sources change, so without
 * this the directory would grow by one file per app update. Keeping only the CURRENTLY
 * resolved key per app collects both cases in a single pass — an uninstalled app has no
 * current key at all, and a superseded entry simply isn't the current one.
 *
 */
export async function pruneIconCache(appPaths: readonly string[], inUse: Iterable<string> = []): Promise<void> {
  const live = new Set(await Promise.all(appPaths.map((appPath) => cacheKey(appPath))));
  // Entries this caller is displaying are spared even when they no longer match the live
  // key: a grid resolves a name, then renders it for as long as the view is open, and if
  // the app's sources move in between, that name stops being "live" while still being on
  // screen.
  for (const entryPath of inUse) live.add(path.basename(entryPath));

  const now = Date.now();
  try {
    const entries = await readdir(CACHE_DIR);
    await Promise.all(
      entries
        // Never touch a `.tmp-*` sibling: it belongs to an extraction that may still be
        // running in another window, and deleting it mid-write fails that icon.
        .filter((entry) => !entry.startsWith(TEMP_PREFIX) && !live.has(entry))
        .map(async (entry) => {
          const target = path.join(CACHE_DIR, entry);
          // `inUse` only covers THIS process. Another Raycast window can be rendering a
          // superseded entry, and nothing here can see its state — so liveness alone would
          // delete a file out from under that window's tiles, which then point at nothing
          // until its own refresh re-resolves them.
          //
          // An age gate answers that without shared state. A superseded entry can only be
          // on screen somewhere if a view resolved it before the app changed, so leaving
          // recently-written entries alone covers every window that could still hold one.
          // Coordination — a lock, or a registry of in-use paths — would reintroduce
          // exactly the cross-process mutable state this cache was rewritten to avoid, and
          // would need to survive a crash to be worth anything.
          const recent = await stat(target).then(
            (info) => now - info.mtimeMs < SUPERSEDED_GRACE_MS,
            () => false, // already gone
          );
          if (recent) return;
          await unlink(target).catch(() => {});
        }),
    );
  } catch {
    // No cache directory yet — nothing to prune.
  }
}
