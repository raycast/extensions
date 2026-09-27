import { execFileSync } from "child_process";

/**
 * Read the HTML flavor of the macOS clipboard.
 *
 * Raycast's `Clipboard.read()` does NOT surface the clipboard's HTML flavor
 * (it returns only text/file), so rich formatting never reaches us through the
 * SDK. We read it directly from the system pasteboard via AppleScript instead.
 *
 * `the clipboard as «class HTML»` returns AppleScript data of the form
 * «data HTML48656C6C6F...» — hex-encoded UTF-8 bytes — which we decode back to
 * a string. Returns "" when there is no HTML flavor (e.g. plain text or image).
 */
export function readClipboardHtml(): string {
  try {
    const out = execFileSync("osascript", ["-e", "get the clipboard as «class HTML»"], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    const m = out.match(/«data HTML([0-9A-Fa-f]+)»/);
    if (!m) return "";
    return Buffer.from(m[1], "hex").toString("utf8");
  } catch {
    return "";
  }
}
