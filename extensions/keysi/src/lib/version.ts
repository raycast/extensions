import { execFileSync } from "child_process";
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
 * The app macOS sends `keysi://` URLs to, or `undefined` if it can't say.
 *
 * With two copies of Keysi installed, the one Launch Services picks for the
 * scheme is the one every command here actually talks to, and it need not
 * be the one the sheet directories point at. Asked through JXA because that
 * is the only route to `NSWorkspace` from a Raycast extension; ~0.2s.
 */
export function keysiURLHandler(): string | undefined {
  try {
    const path = execFileSync(
      "/usr/bin/osascript",
      [
        "-l",
        "JavaScript",
        "-e",
        "ObjC.import('AppKit'); var u = $.NSWorkspace.sharedWorkspace.URLForApplicationToOpenURL($.NSURL.URLWithString('keysi://show')); u.isNil() ? '' : u.path.js",
      ],
      { encoding: "utf8", timeout: 2000 },
    ).trim();
    return path.length > 0 ? path : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The installed version, read from the first bundle that has one.
 *
 * `handlerApp` — the `keysiURLHandler()` result — is checked first, since it
 * is the copy that receives the URL. Then the `BuiltinSheets` directories
 * `builtinSheetDirs()` already resolves, so the Keysi Application preference
 * covers this too; that one comes last there and is checked first here.
 * `undefined` when no bundle is found, which callers treat as "don't offer
 * what might not work".
 */
export function installedVersion(sheetDirs: string[], handlerApp?: string): string | undefined {
  const plists = [
    ...(handlerApp ? [`${handlerApp.replace(/\/+$/, "")}/Contents/Info.plist`] : []),
    ...[...sheetDirs]
      .reverse()
      .map((dir) => dir.replace(/\/Contents\/Resources\/BuiltinSheets\/?$/, "/Contents/Info.plist")),
  ];
  for (const plist of plists) {
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
