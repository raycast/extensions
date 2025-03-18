import fs from "node:fs/promises";
import path from "node:path";

export async function checkDirExists(dirPath: string) {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch (error) {
    return false;
  }
}

export async function transfer(source: string, destination: string, operation: "copy" | "move"): Promise<void> {
  try {
    const srcStat = await fs.lstat(source);

    if (srcStat.isDirectory()) {
      let destDir = destination;
      try {
        const destStat = await fs.stat(destination);
        if (destStat.isDirectory()) {
          destDir = path.join(destination, path.basename(source));
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }
      await fs.mkdir(destDir, { recursive: true });

      const entries = await fs.readdir(source);
      for (const entry of entries) {
        const srcPath = path.join(source, entry);
        const destPath = path.join(destDir, entry);
        await transfer(srcPath, destPath, operation);
      }

      if (operation === "move") {
        await fs.rm(source, { recursive: true, force: true });
      }
    } else if (srcStat.isFile()) {
      let destPath = destination;
      try {
        const destStat = await fs.stat(destination);
        if (destStat.isDirectory()) {
          destPath = path.join(destination, path.basename(source));
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }

      if (operation === "copy") {
        await fs.copyFile(source, destPath);
      } else {
        await fs.rename(source, destPath);
      }
    } else if (srcStat.isSymbolicLink()) {
      let destPath = destination;
      try {
        const destStat = await fs.stat(destination);
        if (destStat.isDirectory()) {
          destPath = path.join(destination, path.basename(source));
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }
      if (operation === "copy") {
        const linkTarget = await fs.readlink(source);
        await fs.symlink(linkTarget, destPath);
      } else {
        await fs.rename(source, destPath);
      }
    } else {
      throw new Error(`Source is neither a file, directory, nor a symbolic link: ${source}`);
    }
  } catch (error) {
    throw new Error(
      `Failed to ${operation} ${source} to ${destination}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function copy(source: string, destination: string): Promise<void> {
  return transfer(source, destination, "copy");
}

export async function move(source: string, destination: string): Promise<void> {
  return transfer(source, destination, "move");
}

export async function checkExistence(sourceFilePath: string, destinationDir: string) {
  const filename = path.basename(sourceFilePath);
  const destinationPath = path.join(destinationDir, filename);
  try {
    await fs.access(destinationPath);
    return true; // If access is successful, it exists
  } catch {
    return false; // If access throws an error, it doesn't exist
  }
}

export async function getFilenameFromPath(filePath: string) {
  return path.basename(filePath);
}

export async function isFile(filePath: string): Promise<boolean> {
  return fs.stat(filePath).then((stat) => stat.isFile());
}

export async function isDirectory(filePath: string): Promise<boolean> {
  return fs.stat(filePath).then((stat) => stat.isDirectory());
}
