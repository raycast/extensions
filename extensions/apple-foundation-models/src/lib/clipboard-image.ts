import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Clipboard images are saved with this prefix so old ones can be cleaned up. */
export const CLIPBOARD_IMAGE_PREFIX = "clipboard-image-";

// Image data on the pasteboard, for example a screenshot copied with ⌃⇧⌘4. Raycast's Clipboard API
// returns text and file paths only, so the data is read with AppKit through JavaScript for Automation.
const IMAGE_TYPES = `[["public.png", "png"], ["public.jpeg", "jpg"], ["public.tiff", "tiff"]]`;

const HAS_IMAGE_SCRIPT = `
function run(argv) {
  ObjC.import("AppKit");
  const board = argv[0] ? $.NSPasteboard.pasteboardWithName(argv[0]) : $.NSPasteboard.generalPasteboard;
  const types = ${IMAGE_TYPES}.map(([type]) => type);
  const found = board.availableTypeFromArray($(types));
  return found && !found.isNil() ? "yes" : "no";
}`;

const SAVE_IMAGE_SCRIPT = `
function run(argv) {
  ObjC.import("AppKit");
  const board = argv[1] ? $.NSPasteboard.pasteboardWithName(argv[1]) : $.NSPasteboard.generalPasteboard;
  const types = ${IMAGE_TYPES};
  for (const [type, extension] of types) {
    const data = board.dataForType(type);
    if (data && !data.isNil() && data.length > 0) {
      const path = argv[0] + "." + extension;
      if (data.writeToFileAtomically(path, true)) return path;
    }
  }
  return "";
}`;

/** Checks for image data on the clipboard without saving it. `pasteboardName` is only for tests. */
export async function hasClipboardImage(pasteboardName = ""): Promise<boolean> {
  const { stdout } = await execFileAsync("/usr/bin/osascript", [
    "-l",
    "JavaScript",
    "-e",
    HAS_IMAGE_SCRIPT,
    pasteboardName,
  ]);
  return stdout.trim() === "yes";
}

/**
 * Saves the image data on the clipboard to a file in `directory` and returns its path, or undefined when
 * the clipboard has no image data. `pasteboardName` is only for tests, so they never touch the real clipboard.
 */
export async function saveClipboardImage(directory: string, pasteboardName = ""): Promise<string | undefined> {
  await mkdir(directory, { recursive: true });
  const base = join(directory, `${CLIPBOARD_IMAGE_PREFIX}${randomUUID()}`);
  const { stdout } = await execFileAsync("/usr/bin/osascript", [
    "-l",
    "JavaScript",
    "-e",
    SAVE_IMAGE_SCRIPT,
    base,
    pasteboardName,
  ]);
  const path = stdout.trim();
  return path || undefined;
}

/** Removes files in `directory` that start with `prefix` and are older than `maxAgeMs`. */
export async function removeOldFiles(directory: string, prefix = "", maxAgeMs = 60 * 60 * 1000): Promise<void> {
  const names = await readdir(directory).catch(() => [] as string[]);
  const now = Date.now();
  await Promise.all(
    names
      .filter((name) => name.startsWith(prefix))
      .map(async (name) => {
        const path = join(directory, name);
        const info = await stat(path).catch(() => undefined);
        if (info?.isFile() && now - info.mtimeMs > maxAgeMs) await rm(path, { force: true });
      }),
  );
}

/** Removes clipboard images saved more than an hour ago. */
export function removeOldClipboardImages(directory: string, maxAgeMs?: number): Promise<void> {
  return removeOldFiles(directory, CLIPBOARD_IMAGE_PREFIX, maxAgeMs);
}
