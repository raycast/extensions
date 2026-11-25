import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { isValidPremiereExtension } from "../utils/format";

const execFileAsync = promisify(execFile);

function pad(num: number): string {
  return num.toString().padStart(2, "0");
}

function formatSetFileDate(d: Date): string {
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
}

export async function updateProjectFileDate(
  filePath: string,
  targetDate: Date,
  updateCreationDate = true,
): Promise<void> {
  if (!fs.existsSync(filePath)) {
    throw new Error("Target project file does not exist");
  }
  if (isNaN(targetDate.getTime())) {
    throw new Error("Invalid target date provided");
  }

  // Update mtime and atime
  await fs.promises.utimes(filePath, targetDate, targetDate);

  // On macOS, optionally update creation date via SetFile if installed
  if (updateCreationDate && process.platform === "darwin" && fs.existsSync("/usr/bin/SetFile")) {
    const formatted = formatSetFileDate(targetDate);
    try {
      await execFileAsync("/usr/bin/SetFile", ["-d", formatted, "-m", formatted, filePath], {
        timeout: 4000,
      });
    } catch {
      // SetFile error is non-fatal if utimes already succeeded
    }
  }
}

export async function safeRenameProject(filePath: string, newTitle: string): Promise<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error("Source project file does not exist");
  }

  const cleanTitle = newTitle.trim();
  if (cleanTitle.length === 0) {
    throw new Error("Project name cannot be empty");
  }

  // Path traversal prevention
  if (
    cleanTitle.includes("/") ||
    cleanTitle.includes("\\") ||
    cleanTitle.includes(":") ||
    cleanTitle.includes("\0") ||
    cleanTitle.includes("..") ||
    cleanTitle === "."
  ) {
    throw new Error("Project name cannot contain slashes, backslashes, colons, null bytes, or relative path segments");
  }

  const dir = path.dirname(filePath);
  const originalExt = path.extname(filePath);
  const hasMatchingExt = cleanTitle.toLowerCase().endsWith(originalExt.toLowerCase());
  const targetName = hasMatchingExt ? cleanTitle : `${cleanTitle}${originalExt}`;
  const targetPath = path.join(dir, targetName);

  if (targetPath === filePath) {
    return filePath;
  }

  const srcStat = await fs.promises.stat(filePath);
  let targetExists = false;
  let isSameFile = false;

  try {
    const targetStat = await fs.promises.stat(targetPath);
    targetExists = true;
    // Check if device and inode match (same file, e.g. case change on case-insensitive FS)
    if (srcStat.dev === targetStat.dev && srcStat.ino === targetStat.ino) {
      isSameFile = true;
    }
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code !== "ENOENT") {
      throw err;
    }
  }

  if (targetExists && !isSameFile) {
    throw new Error(`A project named "${targetName}" already exists in this folder`);
  }

  if (isSameFile) {
    // Case-only rename on case-insensitive filesystem
    const tempName = `.tmp_rename_${Date.now()}_${Math.random().toString(36).slice(2)}_${targetName}`;
    const tempPath = path.join(dir, tempName);

    await fs.promises.rename(filePath, tempPath);
    try {
      await fs.promises.rename(tempPath, targetPath);
    } catch (renameErr) {
      // Revert if second rename fails
      await fs.promises.rename(tempPath, filePath).catch(() => {});
      throw renameErr;
    }
    return targetPath;
  }

  await fs.promises.rename(filePath, targetPath);
  return targetPath;
}

export async function safeTrashProject(filePath: string): Promise<void> {
  if (!fs.existsSync(filePath)) {
    throw new Error("Project file does not exist");
  }

  const ext = path.extname(filePath).replace(".", "").toLowerCase();
  if (!isValidPremiereExtension(ext)) {
    throw new Error(`Cannot delete file: not a recognized Premiere Pro file (${ext})`);
  }

  // Delete project file safely
  await fs.promises.unlink(filePath);
}
