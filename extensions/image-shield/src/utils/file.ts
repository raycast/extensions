import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Create a directory
 * @param dir Directory path
 * @param recursive Create parent directories if they don't exist
 */
export async function createDir(dir: string, recursive = false) {
  await fs.mkdir(dir, { recursive });
}

/**
 * Check if a file exists
 * @param filePath File path
 * @returns True if the file exists, false if it does not
 */
export async function fileExists(filePath: string) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists
 * @param dir Directory path
 * @returns True if the directory exists, false if it does not
 */
export async function dirExists(dir: string) {
  try {
    const stats = await fs.stat(dir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Create a directory if it does not exist
 * @param dir Directory path
 */
export async function createDirIfNotExists(dir: string) {
  if (await dirExists(dir)) {
    return;
  }

  await createDir(dir, true);
}

/**
 * Write a file
 * @param dir Directory path
 * @param filename Filename
 * @param data Data to write
 * @returns Path to the file
 */
export async function writeFile(dir: string, filename: string, data: string | Buffer) {
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, data);
  return filePath;
}
