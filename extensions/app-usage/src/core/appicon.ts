import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Default when an app declares no icon file, which is the modern convention. */
const DEFAULT_ICON_NAME = "AppIcon";

/**
 * Locate an application's `.icns`.
 *
 * `CFBundleIconFile` is written both ways in the wild: Arc says `AppIcon` and
 * Discord says `electron.icns`, so the suffix has to be treated as optional.
 */
async function icnsPath(appPath: string): Promise<string | null> {
  const plist = path.join(appPath, "Contents", "Info.plist");

  let declared = "";
  try {
    const { stdout } = await run("/usr/bin/plutil", ["-extract", "CFBundleIconFile", "raw", plist]);
    declared = stdout.trim();
  } catch {
    // No such key. Fall through to the conventional name.
  }

  const name = declared || DEFAULT_ICON_NAME;
  const file = name.toLowerCase().endsWith(".icns") ? name : `${name}.icns`;
  const full = path.join(appPath, "Contents", "Resources", file);

  try {
    await fs.access(full);
    return full;
  } catch {
    return null;
  }
}

/** One cache file per app. The bundle id is not a safe filename on its own. */
function cacheFile(cacheDir: string, bundleId: string, size: number): string {
  return path.join(cacheDir, `${bundleId.replace(/[^A-Za-z0-9._-]/g, "_")}@${size}.png`);
}

/** Conversions still running, so a clear can wait for them rather than be undone by one. */
const inFlight = new Set<Promise<string | null>>();

/**
 * Render an application's icon to a PNG and return its path.
 *
 * Rendered larger than it is displayed so it stays sharp on a retina screen.
 *
 * Markdown cannot display an `.icns` inside an app bundle, so the icon has to be
 * converted before it can appear in a detail view. `sips` does it in about 30ms
 * and the result is cached, so this costs nothing after the first look at an app.
 *
 * Returns null rather than throwing: a missing icon should cost the heading its
 * image, not break the panel.
 */
export function appIconPng(appPath: string, bundleId: string, cacheDir: string, size = 512): Promise<string | null> {
  const conversion = convert(appPath, bundleId, cacheDir, size);
  inFlight.add(conversion);
  const settle = () => inFlight.delete(conversion);
  conversion.then(settle, settle);
  return conversion;
}

async function convert(appPath: string, bundleId: string, cacheDir: string, size: number): Promise<string | null> {
  const out = cacheFile(cacheDir, bundleId, size);

  try {
    await fs.access(out);
    return out;
  } catch {
    // Not converted yet.
  }

  const icns = await icnsPath(appPath);
  if (!icns) return null;

  try {
    await fs.mkdir(cacheDir, { recursive: true });
    await run("/usr/bin/sips", ["-s", "format", "png", "-Z", String(size), icns, "--out", out]);
    return out;
  } catch {
    return null;
  }
}

/** Remove every cached icon. Nothing here is user data, but it is still ours to clean up. */
export async function clearIconCache(cacheDir: string): Promise<void> {
  // A conversion already under way would write its PNG back after the delete.
  while (inFlight.size > 0) await Promise.allSettled([...inFlight]);
  await fs.rm(cacheDir, { recursive: true, force: true });
}
