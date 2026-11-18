import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { promisify } from "node:util";
import { Clipboard, environment } from "@raycast/api";
import { IMAGE_MIME_TYPES } from "./t3";

const run = promisify(execFile);

/** Reads the clipboard's image as PNG. A screenshot or an image copied from a browser
 * sits there as raw image data, which AppleScript can coerce to PNG; text and files
 * cannot be coerced and make the script fail before it creates anything. */
const WRITE_CLIPBOARD_PNG = `
on run argv
  set theData to (the clipboard as «class PNGf»)
  set f to open for access POSIX file (item 1 of argv) with write permission
  set eof f to 0
  write theData to f
  close access f
end run`;

const CLIPBOARD_FILE = /^clipboard-([0-9a-f]{8})\.png$/;

/** The short hash in a clipboard attachment's file name, so the command can tell a
 * screenshot it already sent from a new one. */
export function clipboardHash(path: string): string | undefined {
  return CLIPBOARD_FILE.exec(path.split("/").pop() ?? "")?.[1];
}

const CLIPBOARD_FILE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Every distinct screenshot is kept as a file, sent or not, so old ones are cleared. */
async function pruneOldClipboardFiles(directory: string) {
  try {
    for (const name of await readdir(directory)) {
      const path = join(directory, name);
      if (Date.now() - (await stat(path)).mtimeMs > CLIPBOARD_FILE_MAX_AGE_MS) {
        await rm(path, { force: true });
      }
    }
  } catch {
    // a file that vanished mid-scan is already gone
  }
}

/** The image currently on the clipboard, as a file path: either the PNG written out
 * from raw image data, or an image file copied in Finder. Undefined when the
 * clipboard holds neither. */
export async function clipboardImagePath(): Promise<string | undefined> {
  const directory = join(environment.supportPath, "clipboard");
  await mkdir(directory, { recursive: true });
  await pruneOldClipboardFiles(directory);
  // One name per call: opening the command and pressing Paste can overlap.
  const scratch = join(directory, `incoming-${randomUUID()}.png`);
  try {
    await run("/usr/bin/osascript", ["-e", WRITE_CLIPBOARD_PNG, scratch]);
    const hash = createHash("sha256")
      .update(await readFile(scratch))
      .digest("hex")
      .slice(0, 8);
    const target = join(directory, `clipboard-${hash}.png`);
    await rename(scratch, target);
    return target;
  } catch {
    await rm(scratch, { force: true });
  }
  try {
    const { file } = await Clipboard.read();
    if (file && IMAGE_MIME_TYPES[extname(file).toLowerCase()]) {
      return decodeURIComponent(file.replace(/^file:\/\//, ""));
    }
  } catch {
    // the clipboard had no readable file
  }
  return undefined;
}
