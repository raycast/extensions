import fs from "node:fs/promises";
import path from "node:path";

export async function checkDirExists(dirPath: string) {
  try {
    const exists = await fs
      .access(dirPath)
      .then(() => true)
      .catch(() => false);
    const isDirectory = await fs
      .stat(dirPath)
      .then((stat) => stat.isDirectory())
      .catch(() => false);

    return exists && isDirectory;
  } catch (error) {
    return false;
  }
}

export async function copyFile(source: string, destination: string): Promise<void> {
  try {
    const destStat = await fs.stat(destination); // Added await
    if (!destStat.isDirectory()) {
      throw new Error("Destination is not a directory");
    }

    const filename = path.basename(source);
    const destPath = path.join(destination, filename);

    const srcStat = await fs.stat(source);
    if (!srcStat.isFile()) {
      throw new Error(`Source is not a file: ${source}`);
    }

    await fs.copyFile(source, destPath);
  } catch (error) {
    throw new Error(`Failed to copy files: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function moveFile(source: string, destination: string): Promise<void> {
  try {
    const destStat = await fs.stat(destination);
    if (!destStat.isDirectory()) {
      throw new Error("Destination is not a directory");
    }

    const filename = path.basename(source);
    const destPath = path.join(destination, filename);

    const srcStat = await fs.stat(source);
    if (!srcStat.isFile()) {
      throw new Error(`Source is not a file: ${source}`);
    }

    await fs.rename(source, destPath);
  } catch (error) {
    throw new Error(`Failed to move files: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function checkFileExists(sourceFilePath: string, destinationDir: string) {
  const filename = path.basename(sourceFilePath);
  const destinationPath = path.join(destinationDir, filename);

  try {
    const exists = await fs
      .access(destinationPath)
      .then(() => true)
      .catch(() => false);

    if (!exists) return false;

    const isFile = await fs
      .stat(destinationPath)
      .then((stat) => stat.isFile())
      .catch(() => false);

    return exists && isFile;
  } catch (error) {
    return false;
  }
}

export async function getFilenameFromPath(filePath: string) {
  return path.basename(filePath);
}
