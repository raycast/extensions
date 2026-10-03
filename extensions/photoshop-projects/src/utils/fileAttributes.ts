import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { runAppleScript } from "./osascript";

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

  const stats = await fs.promises.stat(filePath);
  await fs.promises.utimes(filePath, stats.atime, targetDate);

  if (updateCreationDate) {
    const formatted = formatSetFileDate(targetDate);
    try {
      await execFileAsync("/usr/bin/SetFile", ["-d", formatted, "-m", formatted, filePath], {
        timeout: 4000,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update creation date with SetFile: ${msg}`);
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
  if (cleanTitle.includes("/") || cleanTitle.includes(":")) {
    throw new Error("Document name cannot contain slashes or colons");
  }

  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const targetName = cleanTitle.toLowerCase().endsWith(ext.toLowerCase()) ? cleanTitle : `${cleanTitle}${ext}`;
  const targetPath = path.join(dir, targetName);

  if (targetPath === filePath) {
    return filePath;
  }

  try {
    await fs.promises.link(filePath, targetPath);
    await fs.promises.unlink(filePath);
    return targetPath;
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === "EEXIST") {
      throw new Error(`A file named "${targetName}" already exists in this folder`);
    }

    if (nodeErr.code === "EXDEV" || nodeErr.code === "EPERM") {
      try {
        await fs.promises.copyFile(filePath, targetPath, fs.constants.COPYFILE_EXCL);
        await fs.promises.unlink(filePath);
        return targetPath;
      } catch (copyErr: unknown) {
        const copyNodeErr = copyErr as NodeJS.ErrnoException;
        if (copyNodeErr.code === "EEXIST") {
          throw new Error(`A file named "${targetName}" already exists in this folder`);
        }
        throw copyErr;
      }
    }

    throw err;
  }
}

function escapeAppleScriptString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function openInNewFinderWindow(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  const safeDir = escapeAppleScriptString(dir);
  const safeFile = escapeAppleScriptString(filePath);
  const script = `tell application "Finder"
activate
set targetFolder to (POSIX file "${safeDir}" as alias)
set newWin to make new Finder window to targetFolder
select (POSIX file "${safeFile}")
end tell`;
  await runAppleScript(script, 4000);
}

export async function openInNewFinderTab(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  const safeDir = escapeAppleScriptString(dir);
  const safeFile = escapeAppleScriptString(filePath);
  const script = `tell application "Finder"
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
end tell
end if`;
  await runAppleScript(script, 4000);
}
