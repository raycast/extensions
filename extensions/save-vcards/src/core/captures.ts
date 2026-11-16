// Captured card photos and screenshots, kept so the results view can show them.
// They live in the extension's private support folder and are deleted after a day;
// only the five newest are kept.
import { environment } from "@raycast/api";
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.join(environment.supportPath, "captures");
const KEEP = 5;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const IMAGE = /\.(png|jpe?g|heic|heif|tiff?|gif|bmp|webp)$/i;

export function isImageFile(file: string): boolean {
  return IMAGE.test(file);
}

/** Accepts a path or a file:// URL, as Clipboard.read() may return either. */
export function toPath(file: string): string {
  return file.startsWith("file://") ? fileURLToPath(file) : file;
}

export function newCapturePath(): string {
  mkdirSync(DIR, { recursive: true });
  pruneCaptures();
  return path.join(DIR, `capture-${Date.now()}.png`);
}

/** Copies an image the user picked or copied, so the original can move or vanish. */
export function keepCopy(source: string): string {
  mkdirSync(DIR, { recursive: true });
  pruneCaptures();
  const target = path.join(
    DIR,
    `capture-${Date.now()}${path.extname(source).toLowerCase() || ".png"}`,
  );
  copyFileSync(source, target);
  return target;
}

/** Deletes captures older than a day and all but the five newest. Runs on every command start. */
export function pruneCaptures() {
  try {
    const files = readdirSync(DIR)
      .map((name) => path.join(DIR, name))
      .map((file) => ({ file, time: statSync(file).mtimeMs }))
      .sort((a, b) => b.time - a.time);
    files.forEach(({ file, time }, i) => {
      if (i >= KEEP || Date.now() - time > MAX_AGE_MS)
        rmSync(file, { force: true });
    });
  } catch {
    // nothing to clean
  }
}
