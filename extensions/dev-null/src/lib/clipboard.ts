// Saving an image on the clipboard to a file, so it can be attached like any other. Raycast's Clipboard.read() gives
// a path only when a file was copied (in Finder, say); a screenshot copied with ⌃⇧⌘4, or an image copied from a
// browser or an editor, is only image data. AppKit reads that data in whatever type it came as (PNG, TIFF, HEIC…)
// and writes it as PNG, which /dev/null accepts.

import { execFile } from "node:child_process";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// JavaScript for Automation, so the path arrives as an argument rather than inside the script. A second argument
// names a private pasteboard to read instead of the clipboard, which the tests use.
const SAVE_CLIPBOARD_IMAGE = `
ObjC.import("AppKit");
function run(argv) {
  const pasteboard = argv[1] ? $.NSPasteboard.pasteboardWithName(argv[1]) : $.NSPasteboard.generalPasteboard;
  const image = $.NSImage.alloc.initWithPasteboard(pasteboard);
  if (image.isNil()) return "none";
  const bitmap = $.NSBitmapImageRep.imageRepWithData(image.TIFFRepresentation);
  const png = bitmap.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $());
  return png.writeToFileAtomically(argv[0], true) ? "saved" : "failed";
}`;

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Writes the image on the clipboard as a PNG in `dir` and returns its path, or undefined if the clipboard holds no
 * image. Pasted images older than a week are removed first, except the ones in `keep`, which are still attached.
 */
export async function saveClipboardImage(
  dir: string,
  keep: string[] = [],
  pasteboard?: string,
): Promise<string | undefined> {
  await mkdir(dir, { recursive: true, mode: 0o700 });
  for (const name of await readdir(dir).catch(() => [])) {
    const old = join(dir, name);
    const info = await stat(old).catch(() => undefined);
    if (info && Date.now() - info.mtimeMs > MAX_AGE_MS && !keep.includes(old)) await rm(old, { force: true });
  }

  const path = join(dir, `pasted-${Date.now()}.png`);
  const args = ["-l", "JavaScript", "-e", SAVE_CLIPBOARD_IMAGE, path, ...(pasteboard ? [pasteboard] : [])];
  const { stdout } = await execFileAsync("/usr/bin/osascript", args, { timeout: 15_000 });
  const result = stdout.trim();
  if (result === "none") return undefined;
  if (result !== "saved") throw new Error("Couldn't save the image on the clipboard.");
  return path;
}
