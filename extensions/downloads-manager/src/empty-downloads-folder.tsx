import { popToRoot, showHUD, trash } from "@raycast/api";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { downloadsFolder, hasAccessToDownloadsFolder } from "./utils";

export default async function main() {
  if (!hasAccessToDownloadsFolder()) {
    await showHUD("No permission to access the downloads folder");
    return;
  }

  const entryNames = await readdir(downloadsFolder).catch(() => [] as string[]);
  if (entryNames.length === 0) {
    await showHUD("Downloads folder is empty");
    await popToRoot();
    return;
  }

  const absoluteEntryPaths = entryNames.map((name) => join(downloadsFolder, name));

  try {
    await trash(absoluteEntryPaths);
  } catch {
    // ignore; we'll fallback on Windows
  }

  if (process.platform === "win32") {
    const remainingPaths = await filterPathsThatExist(absoluteEntryPaths);
    if (remainingPaths.length > 0) {
      await sendToRecycleBinWindows(remainingPaths);
    }
  }

  await showHUD("Files moved to Trash");
  await popToRoot();
}

async function filterPathsThatExist(paths: string[]): Promise<string[]> {
  const existing: string[] = [];
  for (const filePath of paths) {
    try {
      await stat(filePath);
      existing.push(filePath);
    } catch {
      // not found; skip
    }
  }
  return existing;
}

async function sendToRecycleBinWindows(paths: string[]): Promise<void> {
  const execFile = promisify(execFileCb);
  for (const filePath of paths) {
    const escaped = filePath.replace(/'/g, "''");
    const isDir = await isDirectoryPath(filePath);
    const command = isDir
      ? `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory('${escaped}', 'OnlyErrorDialogs', 'SendToRecycleBin')`
      : `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${escaped}', 'OnlyErrorDialogs', 'SendToRecycleBin')`;
    try {
      await execFile("powershell", ["-NoProfile", "-NonInteractive", "-Command", command]);
    } catch {
      // ignore individual failures
    }
  }
}

async function isDirectoryPath(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath);
    return s.isDirectory();
  } catch {
    return false;
  }
}
