import { readFileSync } from "fs";

/**
 * Which Keysi this extension is talking to.
 *
 * The extension ships on Raycast's schedule and Keysi on its own, so it
 * routinely meets an older app — and an older Keysi ignores a `keysi://`
 * command it does not know, silently. Asking the bundle is the only way to
 * know first: a URL cannot return anything.
 */

/** `keysi://sheet?id=` arrived in 1.0.24; older apps drop it on the floor. */
export const SHEET_URL_SINCE = "1.0.24";

/** `keysi://show` stopped needing Pro in 1.0.21; older apps open License settings instead. */
export const FREE_SHOW_SINCE = "1.0.21";

/**
 * The installed version, read from the first bundle that has one.
 *
 * Takes the `BuiltinSheets` directories `builtinSheetDirs()` already
 * resolves, so the Keysi Application preference covers this too; that one
 * comes last there and is checked first here. `undefined` when no bundle is
 * found, which callers treat as "don't offer what might not work".
 */
export function installedVersion(sheetDirs: string[]): string | undefined {
  for (const dir of [...sheetDirs].reverse()) {
    const plist = dir.replace(/\/Contents\/Resources\/BuiltinSheets\/?$/, "/Contents/Info.plist");
    try {
      // Xcode writes this Info.plist as XML; a binary one simply doesn't match.
      const match = readFileSync(plist, "utf8").match(
        /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/,
      );
      if (match) return match[1].trim();
    } catch {
      // Not installed here; try the next location.
    }
  }
  return undefined;
}

/** Dotted-number comparison: `1.0.10` is newer than `1.0.9`. */
export function atLeast(version: string | undefined, minimum: string): boolean {
  if (!version) return false;
  const a = version.split(".").map((part) => parseInt(part, 10) || 0);
  const b = minimum.split(".").map((part) => parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return true;
}
