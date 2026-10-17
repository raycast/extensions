import { constants } from "fs";
import { access, stat } from "fs/promises";
import * as path from "path";

// https://litterbox.catbox.moe/ advertises 1 GB. Use decimal GB conservatively.
export const MAX_FILE_SIZE_BYTES = 1_000_000_000;

export function validateFileSize(size: number, filename: string): void {
  if (size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`${filename} exceeds the 1 GB limit (1,000,000,000 bytes). No upload was started for this file.`);
  }
}

export async function validateUploadFile(filePath: string): Promise<void> {
  const filename = path.basename(filePath);
  // https://litterbox.catbox.moe/faq.php disallows .exe, .scr, .cpl, .doc*, .jar.
  if (/\.(exe|scr|cpl|doc[^.]*|jar)$/i.test(filename)) {
    throw new Error(`${filename}: this file type is not allowed by Litterbox.`);
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      throw new Error(`${filename} is not a regular file. Select files, not folders.`);
    }
    validateFileSize(info.size, filename);
    await access(filePath, constants.R_OK);
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      throw new Error(`${filename} cannot be read. Check that it exists and you have permission to read it.`);
    }
    throw error;
  }
}

export async function validateUploadFiles(filePaths: string[]): Promise<void> {
  if (filePaths.length === 0) throw new Error("Select at least one file.");
  // Check the entire selection before the first read/upload, so a bad later file
  // doesn't leave an avoidable partial batch on the service.
  for (const filePath of filePaths) await validateUploadFile(filePath);
}
