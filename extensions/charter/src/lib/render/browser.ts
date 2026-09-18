import { existsSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

/** Checked in this order under /Applications and ~/Applications. */
export const BROWSER_NAMES = ["Google Chrome", "Chromium", "Brave Browser", "Arc", "Microsoft Edge"];

/** The binary inside a bundle: the one named after the app, else the first in Contents/MacOS. */
export function executableFor(appPath: string): string | undefined {
  const dir = join(appPath, "Contents", "MacOS");
  if (!existsSync(dir)) return undefined;
  const entries = readdirSync(dir);
  const named = basename(appPath, ".app");
  const pick = entries.find((entry) => entry === named) ?? entries[0];
  return pick ? join(dir, pick) : undefined;
}

function candidates(): string[] {
  const home = process.env.HOME ?? "";
  return ["/Applications", join(home, "Applications")].flatMap((root) =>
    BROWSER_NAMES.map((app) => join(root, `${app}.app`)),
  );
}

/**
 * Browsers to try, the app chosen in preferences first. The picker allows any
 * app, so an unsuitable choice falls through to the ones we know rather than
 * failing the render.
 */
export function findBrowsers(preferred?: string): string[] {
  const paths = preferred ? [preferred, ...candidates()] : candidates();
  const executables = paths.map((path) => executableFor(path)).filter((path): path is string => Boolean(path));
  return [...new Set(executables)];
}
