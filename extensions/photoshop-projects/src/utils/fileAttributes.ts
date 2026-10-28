import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { escapeAppleScriptString, executeAppleScript } from "./osascript";

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

export async function updateFileDate(filePath: string, targetDate: Date, updateCreationDate = true): Promise<void> {
  if (!fs.existsSync(filePath)) {
    throw new Error("Target file does not exist");
  }
  if (isNaN(targetDate.getTime())) {
    throw new Error("Invalid target date provided");
  }

  await fs.promises.utimes(filePath, targetDate, targetDate);

  if (updateCreationDate) {
    const formatted = formatSetFileDate(targetDate);
    try {
      await execFileAsync("/usr/bin/SetFile", ["-d", formatted, "-m", formatted, filePath], {
        timeout: 4000,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update creation date via SetFile: ${msg}`);
    }
  }
}

export async function renamePhotoshopFile(filePath: string, newTitle: string): Promise<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error("Source file does not exist");
  }

  const cleanTitle = newTitle.trim();
  if (cleanTitle.length === 0) {
    throw new Error("Document name cannot be empty");
  }
  if (cleanTitle.includes("/") || cleanTitle.includes(":") || cleanTitle.includes("\\") || cleanTitle.includes("\0")) {
    throw new Error("Document name cannot contain slashes, backslashes, colons, or null bytes");
  }
  if (cleanTitle === ".." || cleanTitle === "." || cleanTitle.includes("..")) {
    throw new Error("Document name cannot contain relative path segments");
  }

  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const targetName = cleanTitle.toLowerCase().endsWith(ext.toLowerCase()) ? cleanTitle : `${cleanTitle}${ext}`;
  const targetPath = path.join(dir, targetName);

  if (targetPath === filePath) {
    return filePath;
  }

  const isCaseOnlyRename = targetPath.toLowerCase() === filePath.toLowerCase();

  if (!isCaseOnlyRename) {
    if (fs.existsSync(targetPath)) {
      throw new Error(`A file named "${targetName}" already exists in this folder`);
    }

    try {
      await fs.promises.link(filePath, targetPath);
      await fs.promises.unlink(filePath);
      return targetPath;
    } catch (error: unknown) {
      if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "EEXIST") {
        throw new Error(`A file named "${targetName}" already exists in this folder`);
      }
      await fs.promises.rename(filePath, targetPath);
      return targetPath;
    }
  } else {
    const tempPath = path.join(dir, `.tmp_rename_${Date.now()}_${path.basename(targetPath)}`);
    await fs.promises.rename(filePath, tempPath);
    await fs.promises.rename(tempPath, targetPath);
    return targetPath;
  }
}

export async function openInNewFinderWindow(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  const safeDir = escapeAppleScriptString(dir);
  const safeFile = escapeAppleScriptString(filePath);
  const script = `
tell application "Finder"
  activate
  set targetFolder to (POSIX file "${safeDir}" as alias)
  set newWin to make new Finder window to targetFolder
  select (POSIX file "${safeFile}")
end tell`;
  await executeAppleScript(script, 4000);
}

export async function openInNewFinderTab(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  const safeDir = escapeAppleScriptString(dir);
  const safeFile = escapeAppleScriptString(filePath);
  const script = `
tell application "Finder"
  activate
  if (count of windows) > 0 then
    tell application "System Events" to tell process "Finder" to keystroke "t" using command down
    delay 0.1
    set target of front Finder window to (POSIX file "${safeDir}" as alias)
    select (POSIX file "${safeFile}")
  else
    set targetFolder to (POSIX file "${safeDir}" as alias)
    set newWin to make new Finder window to targetFolder
    select (POSIX file "${safeFile}")
  end if
end tell`;
  await executeAppleScript(script, 4000);
}
