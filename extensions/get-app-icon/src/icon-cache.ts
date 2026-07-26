import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, stat, unlink } from "node:fs/promises";
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
  let fields = line.components(separatedBy: " ")
  guard fields.count >= 2,
        let inData = Data(base64Encoded: fields[0]),
        let outData = Data(base64Encoded: fields[1]),
        let appPath = String(data: inData, encoding: .utf8),
        let outPath = String(data: outData, encoding: .utf8) else { continue }
  let icon = NSWorkspace.shared.icon(forFile: appPath)
  icon.size = NSSize(width: s, height: s)
  guard let bmp = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: s, pixelsHigh: s, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0) else { continue }
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bmp)
  icon.draw(in: NSRect(x: 0, y: 0, width: s, height: s), from: .zero, operation: .copy, fraction: 1.0)
  NSGraphicsContext.restoreGraphicsState()
  // Write to a sibling temp file and rename into place: a failed or partial write
  // then leaves no half-PNG for the grid to render.
  var wrote = false
  if let data = bmp.representation(using: .png, properties: [:]) {
    let finalURL = URL(fileURLWithPath: outPath)
    let tmpURL = finalURL.deletingLastPathComponent()
      .appendingPathComponent(".tmp-" + UUID().uuidString)
    do {
      try data.write(to: tmpURL, options: .atomic)
      _ = try FileManager.default.replaceItemAt(finalURL, withItemAt: tmpURL)
      wrote = true
    } catch {
      try? FileManager.default.removeItem(at: tmpURL)
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
 * Apps whose cached icon is missing or older than the bundle itself. An app that
 * updates rewrites its bundle mtime, so this re-extracts exactly the icons that
 * changed and leaves the rest alone.
 */
async function findStaleApps(appPaths: readonly string[]): Promise<string[]> {
  const stale = await Promise.all(
    appPaths.map(async (appPath) => {
      const cached = cachedIconPath(appPath);
      try {
        const [cachedStat, appStat] = await Promise.all([stat(cached), stat(appPath)]);
        return cachedStat.mtimeMs >= appStat.mtimeMs ? null : appPath;
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
  const jobs = stale.map((appPath) => `${encode(appPath)} ${encode(cachedIconPath(appPath))}`).join("\n");

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
}

/**
 * Drop cache entries for apps that are no longer installed, so an uninstalled app
 * doesn't leave a PNG behind forever.
 */
export async function pruneIconCache(appPaths: readonly string[]): Promise<void> {
  const live = new Set(appPaths.map((appPath) => cacheFileName(appPath)));
  try {
    const entries = await readdir(CACHE_DIR);
    await Promise.all(
      entries.filter((entry) => !live.has(entry)).map((entry) => unlink(path.join(CACHE_DIR, entry)).catch(() => {})),
    );
  } catch {
    // No cache directory yet — nothing to prune.
  }
}
