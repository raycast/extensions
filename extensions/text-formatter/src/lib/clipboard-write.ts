import { execFileSync } from "child_process";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

/**
 * Write BOTH clipboard flavors — plain text and rich HTML — to the macOS
 * pasteboard.
 *
 * Raycast's `Clipboard.copy({ text, html })` accepts an `html` field in its
 * types, but on macOS it only ends up placing the plain-text flavor on the
 * pasteboard: inspecting `NSPasteboard.types` after a copy shows
 * `public.utf8-plain-text` and `NSStringPboardType` with no `public.html`.
 *
 * That silently breaks every destination that renders real formatting instead
 * of parsing markdown. Slack is the obvious casualty — it reads the plain-text
 * flavor, and since its own bold syntax is single-asterisk, `**bold**` arrives
 * as literal asterisks. Markdown-aware targets (Notion, ChatGPT, Obsidian) look
 * fine because they parse the markers themselves, which is what makes the bug
 * look intermittent rather than total.
 *
 * So we set the flavors directly. `NSPasteboardTypeHTML` gives us `public.html`
 * plus the legacy "Apple HTML pasteboard type", which is also what AppleScript's
 * «class HTML» reads — keeping us symmetric with `readClipboardHtml()`.
 */
export function writeRichClipboard(text: string, html: string): void {
  // Content goes via a private temp file rather than argv: clipboard payloads can
  // exceed ARG_MAX, and a truncated paste is worse than a slow one.
  const dir = mkdtempSync(join(tmpdir(), "raycast-clipboard-"));
  const htmlPath = join(dir, "body.html");
  const textPath = join(dir, "body.txt");

  const script = `
ObjC.import('AppKit');
function readFile(p) {
  return ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, $()));
}
const html = readFile(${JSON.stringify(htmlPath)});
const text = readFile(${JSON.stringify(textPath)});
const pb = $.NSPasteboard.generalPasteboard;
pb.clearContents;
pb.setStringForType($(html), $.NSPasteboardTypeHTML);
pb.setStringForType($(text), $.NSPasteboardTypeString);
`;

  try {
    writeFileSync(htmlPath, html, { encoding: "utf8", mode: 0o600 });
    writeFileSync(textPath, text, { encoding: "utf8", mode: 0o600 });
    execFileSync("osascript", ["-l", "JavaScript", "-e", script], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
  } finally {
    // Never leave clipboard contents sitting on disk, even if osascript failed.
    rmSync(dir, { recursive: true, force: true });
  }
}
