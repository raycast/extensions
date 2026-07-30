import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
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
 * `NSWorkspace.icon(forFile:)` returns an image whose *nominal* size is 32pt even
 * though it carries representations up to 2048px. Raycast's `fileIcon` renders that
 * nominal size, so a grid tile upscales 32pt to ~128pt and looks soft. Drawing the
 * icon into an explicitly-sized bitmap forces the high-resolution representation.
 *
 * Reads `appPath<TAB>outPath` lines from stdin so a whole fleet costs one process
 * launch — the per-icon work is ~20ms, but each `xcrun swift` launch is ~1s, which
 * is why this is batched rather than called per app.
 */
const EXTRACTOR_SWIFT = `
import AppKit
let s = ${CACHE_ICON_SIZE}
while let line = readLine() {
  // Each field is base64 so a path containing a tab or newline can't forge an extra
  // record. Anything that doesn't decode is skipped rather than guessed at.
  // EXACTLY ONE line is printed per input line, on every path. The caller pairs the Nth
  // result with the Nth job, so a silent skip would shift every later result by one and
  // attribute an outcome to the wrong app. Verified: a job with an undecodable field used
  // to print nothing, and 3 jobs produced 2 lines.
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
  // Third field: the icon-source mtime the caller observed before we drew anything.
  let stamp = fields.count >= 3 ? Double(fields[2]) : nil
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
      // Stamp the temp file first so the entry is never even briefly visible carrying a
      // wall-clock mtime; the post-finalization block below is what actually enforces it.
      if let stamp = stamp, stamp > 0 {
        try? fm.setAttributes([.modificationDate: Date(timeIntervalSince1970: stamp)], ofItemAtPath: tmpURL.path)
      }
      if fm.fileExists(atPath: finalURL.path) {
        _ = try fm.replaceItemAt(finalURL, withItemAt: tmpURL)
      } else {
        try fm.moveItem(at: tmpURL, to: finalURL)
      }
      // Re-apply the stamp AFTER finalization and verify it took. \`moveItem\` preserves
      // metadata within a volume, but \`replaceItemAt\` makes no broad cross-filesystem
      // guarantee about the modification date — and if the stamp silently reverts to
      // wall-clock time, an old bitmap drawn before an update reads as newer than the
      // updated app and the stale icon is served forever. That is the exact race the
      // stamp exists to prevent, so it must not depend on an unchecked \`try?\`.
      if let stamp = stamp, stamp > 0 {
        let target = Date(timeIntervalSince1970: stamp)
        try fm.setAttributes([.modificationDate: target], ofItemAtPath: finalURL.path)
        let applied = (try fm.attributesOfItem(atPath: finalURL.path)[.modificationDate] as? Date)
        // Sub-millisecond slack: the stamp is serialized to 3 decimal places, so an exact
        // equality check would fail on filesystems with finer resolution.
        guard let applied = applied, abs(applied.timeIntervalSince1970 - stamp) < 0.002 else {
          // Leave no entry rather than one whose mtime lies about what it depicts.
          try? fm.removeItem(at: finalURL)
          print("fail")
          fflush(stdout)
          continue
        }
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
 * Cache filename for an app, keyed by a hash of the full bundle path.
 *
 * Hashing rather than sanitizing: replacing every non-alphanumeric character with
 * `_` collapses `A-B.app` and `A_B.app` onto one filename, so the two apps would
 * share a cache entry and one grid tile would show the other's icon. It also keeps
 * the name short, which sanitizing a deep path does not.
 */
function cacheFileName(appPath: string): string {
  const digest = createHash("sha256").update(appPath).digest("hex").slice(0, 32);
  return `${digest}-${CACHE_ICON_SIZE}.png`;
}

export function cachedIconPath(appPath: string): string {
  return path.join(CACHE_DIR, cacheFileName(appPath));
}

/**
 * Marker written beside a cache entry that was drawn while the app's icon sources were
 * unreadable.
 *
 * Timestamps alone can't express "drawn blind". An entry written *before* an outage and
 * one written *during* it are both newer than the app's last readable stamp, so no mtime
 * comparison can tell them apart — and that ambiguity is what forced a choice between
 * serving a pre-update icon forever and relaunching the extractor on every grid visit.
 * The marker records the fact directly: present means "we already re-drew this while
 * blind, don't do it again"; absent means we haven't, so do it once.
 */
const BLIND_SUFFIX = ".blind";

function blindMarkerPath(appPath: string): string {
  return path.join(CACHE_DIR, `${cacheFileName(appPath)}${BLIND_SUFFIX}`);
}

/**
 * The paths whose mtimes decide whether a cached icon is still current.
 *
 * The bundle root alone is not enough. An updater that rewrites files *inside* the
 * bundle leaves the root's mtime untouched, so an app that changed its icon in place
 * kept showing the old tile forever. Measured on a real in-place update: the root
 * stayed at 12:25:41 while `Contents/Info.plist` moved to 12:25:42.
 *
 * `Info.plist` is included because it names the icon file, and `Resources` because its
 * directory mtime moves when an icon is added, replaced, or removed. Missing entries
 * are ignored, so an Asset Catalog app with no `.icns` is handled by the same check.
 *
 * The icon payloads themselves are sampled too, because a directory's mtime moves only
 * when an *entry* changes — rewriting an existing file's bytes leaves it untouched.
 * Verified: overwriting `AppIcon.icns` in place moved only that file's mtime, and none of
 * the four directory/plist stamps, so the change was invisible without this.
 *
 * `AppIcon.icns` and `Assets.car` are the conventional names and cover the overwhelming
 * majority; a bundle using a different `CFBundleIconFile` still gets caught by the
 * `Resources` directory stamp on any add/replace/remove. Reading the plist to resolve the
 * real name would cost a `plutil` spawn per app per grid visit, which is a bad trade for
 * a case the directory stamp already handles.
 */
function iconStampPaths(appPath: string): string[] {
  const resources = path.join(appPath, "Contents", "Resources");
  return [
    appPath,
    path.join(appPath, "Contents"),
    path.join(appPath, "Contents", "Info.plist"),
    resources,
    path.join(resources, "AppIcon.icns"),
    path.join(resources, "Assets.car"),
  ];
}

/**
 * What the icon-source timestamps say about an app.
 *
 * `mtime` is the newest readable stamp. `unverifiable` records that a stamp existed but
 * couldn't be read, which is *not* the same as "unchanged" — see below.
 */
type IconSourceStamp = {
  mtime: number;
  unverifiable: boolean;
};

/**
 * The icon-source timestamps for an app: the newest readable mtime, plus whether any
 * stamp was unreadable.
 *
 * Three-way, because two of these are easy to conflate and each collapse is a real bug:
 *
 * - **Absent** (`ENOENT`/`ENOTDIR`) contributes nothing. That's the ordinary shape of an
 *   Asset Catalog app with no `Resources`, so it must not force re-extraction.
 * - **Unreadable** (`EACCES`, I/O error) is *no information at all*. Treating it as 0 lets
 *   an in-place update hide: if the only paths that moved are the unreadable ones, the
 *   stale-but-newer-than-the-root cache passes the freshness test and the grid serves the
 *   pre-update icon forever. Verified with the bundle root at mode 000 — `Contents`,
 *   `Info.plist` and `Resources` all `EACCES`, root mtime unchanged, cache judged FRESH.
 * - **Readable** decides normally.
 *
 * `unverifiable` is deliberately *not* folded into `mtime` as a sentinel. An earlier
 * revision returned `Infinity` for the unreadable case; that is unsatisfiable — no file's
 * mtime is >= Infinity — so entries stayed stale forever and every grid visit relaunched
 * the extractor for an icon already cached successfully. Callers get the fact and decide,
 * which is what lets extraction converge once access recovers.
 */
async function iconSourceStamp(appPath: string): Promise<IconSourceStamp> {
  const results = await Promise.all(
    iconStampPaths(appPath).map(async (target) => {
      try {
        return { mtime: (await stat(target)).mtimeMs, unverifiable: false };
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        const absent = code === "ENOENT" || code === "ENOTDIR";
        return { mtime: 0, unverifiable: !absent };
      }
    }),
  );
  return {
    mtime: Math.max(...results.map((result) => result.mtime)),
    unverifiable: results.some((result) => result.unverifiable),
  };
}

/**
 * Apps whose cached icon is missing, older than the bundle's icon sources, or whose
 * sources couldn't be read — so this re-extracts exactly the icons that changed, plus the
 * ones we can't vouch for, and leaves the rest alone.
 *
 * An unreadable source counts as stale, because the alternative is serving a pre-update
 * icon indefinitely — but only until one extraction has actually run against it.
 *
 * The bound matters as much as the trigger. Returning stale on `unverifiable` alone
 * relaunches the Swift extractor on *every* grid visit for as long as the condition
 * lasts, and a bundle can be unreadable permanently (restrictive permissions, a mount
 * that never comes back). That is a ~1s process launch and a progress toast on every
 * open, for an icon already sitting correctly in the cache — measured: five visits, five
 * extractions, no convergence.
 *
 * A cache entry written *after* the newest readable evidence has already incorporated
 * whatever we last saw, so it is re-extracted once and then trusted while the condition
 * persists. Real change still gets through: any readable stamp that moves — including the
 * bundle root, which an installer or a mount cycle touches — pushes `source.mtime` past
 * the entry and marks it stale again.
 */
async function findStaleApps(appPaths: readonly string[]): Promise<string[]> {
  const stale = await Promise.all(
    appPaths.map(async (appPath) => {
      const cached = cachedIconPath(appPath);
      try {
        const [cachedStat, source] = await Promise.all([stat(cached), iconSourceStamp(appPath)]);
        if (source.unverifiable) {
          // Blind: re-draw once, then trust it. The marker — not a timestamp — is what
          // distinguishes "already re-drawn during this outage" from "written before it",
          // which mtimes cannot express.
          const alreadyRedrawn = await stat(blindMarkerPath(appPath)).then(
            () => true,
            () => false,
          );
          return alreadyRedrawn ? null : appPath;
        }
        // Sources are readable again, so the marker has served its purpose. Clear it here
        // rather than during extraction: a recovered app is usually *not* stale, so the
        // extractor never runs for it and a marker cleared only there would outlive the
        // outage — and then suppress the one re-draw a genuine later outage should get.
        await unlink(blindMarkerPath(appPath)).catch(() => {});
        return cachedStat.mtimeMs >= source.mtime ? null : appPath;
      } catch {
        return appPath; // not cached yet
      }
    }),
  );
  return stale.filter((appPath): appPath is string => appPath !== null);
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

  const encode = (value: string) => Buffer.from(value, "utf8").toString("base64");
  // Apps whose sources couldn't be read this pass. Collected here, marked only after the
  // extractor confirms each one was actually redrawn.
  const blind = new Set<string>();
  // Each job carries the icon-source mtime observed BEFORE drawing, and the extractor
  // stamps the file it writes with that value instead of "now".
  //
  // Without this, a bitmap drawn from the pre-update bundle can land after an export has
  // invalidated the entry, and its wall-clock mtime would then be newer than the updated
  // app's — marking demonstrably stale pixels fresh forever. Stamping with the observed
  // time makes the file's mtime describe *what was drawn*, so if the app changed in the
  // meantime the entry stays behind the app and is re-extracted on the next visit.
  const jobs = (
    await Promise.all(
      stale.map(async (appPath) => {
        const source = await iconSourceStamp(appPath);
        // Seconds, as Swift's Date(timeIntervalSince1970:) takes. Rounded UP to the next
        // millisecond: the freshness test is `cached >= source`, so a stamp that landed
        // even a fraction of a millisecond below the source mtime would read as stale on
        // every single grid visit and re-extract the whole fleet forever. Ceiling keeps a
        // just-written entry at or above its source while staying far below the mtime any
        // later app update would produce.
        //
        // Omit the stamp when the sources couldn't be fully read, or when there is no
        // usable time at all. `source.mtime` then describes only the *readable* subset,
        // which for an unverifiable app is precisely the pre-update root that hid the
        // change in the first place — stamping with it would leave the entry looking older
        // than it is and re-extract on every visit.
        //
        // Wall-clock is the correct mtime here, and it is what bounds the work: it records
        // when these pixels were drawn, it is necessarily >= every readable stamp, so the
        // freshness test in `findStaleApps` accepts the entry on the next visit instead of
        // relaunching the extractor. The pixels are current regardless of the unreadable
        // path, because `NSWorkspace` resolves an app's icon without needing to stat the
        // bundle's interior.
        const usable = !source.unverifiable && Number.isFinite(source.mtime) && source.mtime > 0;
        const stamp = usable ? ` ${(Math.ceil(source.mtime) / 1000).toFixed(3)}` : "";
        // Note which apps are being drawn blind, but do NOT mark them yet — the marker
        // means "a redraw completed", and nothing has been drawn at this point.
        if (source.unverifiable) blind.add(appPath);
        return `${encode(appPath)} ${encode(cachedIconPath(appPath))}${stamp}`;
      }),
    )
  ).join("\n");

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
  let done = 0;
  let pending = "";
  // The extractor emits one line per job, in the order the jobs were written, so the
  // Nth line belongs to `stale[N]`. Tracking that index is what lets a blind app be
  // marked only once ITS redraw is confirmed.
  let resultIndex = 0;
  const redrawn: string[] = [];
  child.child.stdout?.on("data", (chunk: Buffer) => {
    // Chunks can split mid-line, so hold the remainder until its newline arrives.
    pending += chunk.toString();
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) {
      if (line !== "done" && line !== "fail") continue;
      const appPath = stale[resultIndex];
      resultIndex += 1;
      if (line !== "done") continue;
      done += 1;
      if (appPath !== undefined && blind.has(appPath)) redrawn.push(appPath);
    }
    onProgress?.(Math.min(done, stale.length), stale.length);
  });

  try {
    await child;
  } finally {
    signal?.removeEventListener("abort", abort);
    // Mark blind apps only now, and only the ones the extractor confirmed with `done`.
    //
    // Writing the marker up front committed a redraw that hadn't happened: leaving the
    // grid kills the extractor mid-batch, and an individual write can fail, either of
    // which left the marker claiming "already redrawn" for an entry still holding the old
    // pixels — so every later visit accepted a stale icon indefinitely. Reproduced before
    // this change: abort the extractor once and the stale tile persists forever.
    //
    // In `finally` so an abort still records the icons that DID complete before the kill;
    // dropping those would re-extract work that genuinely finished.
    await Promise.all(redrawn.map((appPath) => writeFile(blindMarkerPath(appPath), "").catch(() => {})));
  }

  // Report what actually succeeded. Claiming `stale.length` here would paper over a
  // batch where some writes failed.
  onProgress?.(done, stale.length);
  return done;
}

/**
 * The apps that currently have a cached icon on disk. The grid uses this to choose
 * between the sharp cached PNG and the system `fileIcon`, so it reflects what was
 * really written rather than what we hoped would be.
 */
export async function listCachedApps(appPaths: readonly string[]): Promise<Set<string>> {
  const cached = await Promise.all(
    appPaths.map(async (appPath) => {
      try {
        await stat(cachedIconPath(appPath));
        return appPath;
      } catch {
        return null;
      }
    }),
  );
  return new Set(cached.filter((appPath): appPath is string => appPath !== null));
}

/**
 * Drop one app's cached icon so the next grid visit re-extracts it.
 *
 * Called after an export, which is the one moment we know the user has deliberately
 * touched this app — and exports read the live bundle, never the cache. Bundle-root
 * mtime doesn't always change when an app updates its icon in place, so this is the
 * cheap self-healing path for a stale tile: no per-launch version probing, and the
 * user can refresh a wrong icon by exporting it.
 */
export async function invalidateCachedIcon(appPath: string): Promise<void> {
  await unlink(cachedIconPath(appPath)).catch(() => {});
  // Drop the blind marker too, or an app cached during an outage would keep its
  // "already re-drawn" pass and skip the re-extraction this invalidation exists to force.
  await unlink(blindMarkerPath(appPath)).catch(() => {});
}

/**
 * Drop cache entries for apps that are no longer installed, so an uninstalled app
 * doesn't leave a PNG behind forever.
 */
export async function pruneIconCache(appPaths: readonly string[]): Promise<void> {
  const live = new Set(appPaths.map((appPath) => cacheFileName(appPath)));
  // A `<name>.blind` marker belongs to a live entry too. Without this it would be pruned
  // on every grid visit — and a marker that never survives is a marker that never bounds
  // anything, putting the blind case straight back into re-extracting forever.
  const isLive = (entry: string) =>
    live.has(entry) || (entry.endsWith(BLIND_SUFFIX) && live.has(entry.slice(0, -BLIND_SUFFIX.length)));
  try {
    const entries = await readdir(CACHE_DIR);
    await Promise.all(
      entries
        // Never touch a `.tmp-*` sibling: it belongs to an extraction that may still be
        // running in another window, and deleting it mid-write fails that icon.
        .filter((entry) => !entry.startsWith(TEMP_PREFIX) && !isLive(entry))
        .map((entry) => unlink(path.join(CACHE_DIR, entry)).catch(() => {})),
    );
  } catch {
    // No cache directory yet — nothing to prune.
  }
}
