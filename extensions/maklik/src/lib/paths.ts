import { copyFile, mkdir, rename, rm, unlink } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";
import { v4 as uuidv4 } from "uuid";

const TEMP_DIR = join(tmpdir(), "raycast-maklik");
const FAILED_DIR = join(homedir(), "Pictures", "RaycastShots", "failed");

export type ImageExtension = "png" | "webp" | "jpg";

export async function createTempFilePath(extension: ImageExtension): Promise<string> {
  await mkdir(TEMP_DIR, { recursive: true });
  return join(TEMP_DIR, `${uuidv4()}.${extension}`);
}

export function buildObjectKey(
  prefix?: string,
  date = new Date(),
  extension: Exclude<ImageExtension, "png"> = "webp",
): string {
  const year = date.getFullYear().toString();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const filename = `${uuidv4()}.${extension}`;
  const keyBody = `${year}/${month}/${day}/${filename}`;
  return prefix ? `${normalizePrefix(prefix)}/${keyBody}` : keyBody;
}

export async function moveToFailureDirectory(
  sourcePath: string,
  objectKey: string,
  date = new Date(),
): Promise<string> {
  await mkdir(FAILED_DIR, { recursive: true });

  const timestamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate(),
  ).padStart(2, "0")}-${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}${String(
    date.getSeconds(),
  ).padStart(2, "0")}`;
  const destinationPath = join(FAILED_DIR, `${timestamp}-${basename(objectKey)}`);

  try {
    await rename(sourcePath, destinationPath);
    return destinationPath;
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code === "EXDEV") {
      await copyFile(sourcePath, destinationPath);
      await unlink(sourcePath);
      return destinationPath;
    }
    throw error;
  }
}

export async function cleanupFile(filePath: string | undefined): Promise<void> {
  if (!filePath) return;
  await rm(filePath, { force: true });
}

function normalizePrefix(prefix: string): string {
  return prefix
    .trim()
    .replace(/^\/*/g, "")
    .replace(/\/*$/g, "")
    .replace(/\/{2,}/g, "/");
}
