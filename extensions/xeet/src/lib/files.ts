import { constants } from "node:fs";
import { copyFile, mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const PREVIEW_TTL = 24 * 60 * 60 * 1000;

export async function readAvatar(path: string): Promise<string> {
  const info = await stat(path);
  if (!info.isFile() || info.size > MAX_IMAGE_BYTES)
    throw new Error("Choose a PNG, JPEG, or WebP avatar smaller than 8 MB.");
  const bytes = await readFile(path);
  if (!(
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ||
    (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP")
  )) {
    throw new Error("Choose a PNG, JPEG, or WebP image. Other avatar formats are not supported.");
  }
  return bytes.toString("base64");
}

export async function cleanPreviews(directory: string, now = Date.now()): Promise<void> {
  await mkdir(directory, { recursive: true });
  for (const file of await readdir(directory)) {
    if (!/^xeet-[\w-]+\.png$/.test(file)) continue;
    const path = join(directory, file);
    try {
      if (now - (await stat(path)).mtimeMs > PREVIEW_TTL) await unlink(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

export async function writePreview(directory: string, png: Uint8Array): Promise<string> {
  await cleanPreviews(directory);
  const path = join(directory, `xeet-${randomUUID()}.png`);
  await writeFile(path, png, { flag: "wx", mode: 0o600 });
  return path;
}

/** A unique destination and COPYFILE_EXCL avoid overwriting the user's exports. */
export async function exportPng(source: string, directory: string): Promise<string> {
  await mkdir(directory, { recursive: true });
  const path = join(
    directory,
    `xeet-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}.png`,
  );
  await copyFile(source, path, constants.COPYFILE_EXCL);
  return path;
}
