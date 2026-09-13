/**
 * This file provides utilities for copying text content as a local file.
 * It writes the formatted prompt content to a dedicated folder under the
 * system temporary directory and returns the file path for clipboard
 * file operations.
 */
import fs from "fs";
import os from "os";
import path from "path";

const COPY_AS_FILE_DIR = path.join(os.tmpdir(), "quickgpt-copied-files");
const MAX_KEPT_FILES = 20;

function sanitizeFileName(title: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|\n\r]/g, "_")
    .trim()
    .slice(0, 50);
  const meaningful = cleaned.replace(/^_+|_+$/g, "");
  return meaningful ? cleaned : "prompt";
}

function cleanupOldFiles(): void {
  const files = fs
    .readdirSync(COPY_AS_FILE_DIR)
    .map((name) => {
      const fullPath = path.join(COPY_AS_FILE_DIR, name);
      return { fullPath, mtime: fs.statSync(fullPath).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  files.slice(MAX_KEPT_FILES).forEach((f) => fs.rmSync(f.fullPath, { force: true }));
}

/**
 * Writes content to a local file and returns its absolute path.
 */
export function writeContentToFile(content: string, title: string): string {
  fs.mkdirSync(COPY_AS_FILE_DIR, { recursive: true });
  cleanupOldFiles();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(COPY_AS_FILE_DIR, `${sanitizeFileName(title)}-${timestamp}.md`);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}
