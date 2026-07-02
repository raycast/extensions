import fs from "fs/promises";
import path from "path";
import os from "os";

export function expandTilde(inputPath: string): string {
  if (inputPath === "~") {
    return os.homedir();
  }
  if (inputPath.startsWith("~/")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDirExists(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function ensureFileExists(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDirExists(dir);
  if (!(await pathExists(filePath))) {
    await fs.writeFile(filePath, "", "utf8");
  }
}
