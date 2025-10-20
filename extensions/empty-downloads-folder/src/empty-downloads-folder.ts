import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

export default async function main(): Promise<void> {
  const preferences = getPreferenceValues<{ folderPath?: string }>();
  const userHomeDirectory = os.homedir();

  // Prefer common OneDrive locations first (personal), then fall back to the local Downloads folder
  const candidateDownloadsDirectories = [
    ...(preferences.folderPath ? [preferences.folderPath] : []),
    path.join(userHomeDirectory, "OneDrive", "Downloads"),
    path.join(userHomeDirectory, "Downloads"),
  ];

  const downloadsDirectory = await resolveExistingDirectory(candidateDownloadsDirectories);

  if (!downloadsDirectory) {
    await notifyDownloadsEmpty();
    return;
  }

  const entryNames = await fs.readdir(downloadsDirectory).catch(() => [] as string[]);
  if (entryNames.length === 0) {
    await notifyDownloadsEmpty();
    return;
  }

  const absoluteEntryPaths = entryNames.map((entryName) => path.join(downloadsDirectory, entryName));

  try {
    const trash = (await import("trash")).default;
    await trash(absoluteEntryPaths, { glob: false });
  } catch {
    // Intentionally ignore errors to remain silent besides the success HUD
  }

  // Fallback for Windows: if any entries still exist, send them to the Recycle Bin via PowerShell
  if (process.platform === "win32") {
    const remainingPaths = await filterPathsThatExist(absoluteEntryPaths);
    if (remainingPaths.length > 0) {
      await sendToRecycleBinWindows(remainingPaths);
    }
  }

  await showToast(Toast.Style.Success, "Files trashed");
}

async function resolveExistingDirectory(candidateDirectories: string[]): Promise<string | undefined> {
  for (const directoryPath of candidateDirectories) {
    try {
      const stats = await fs.stat(directoryPath);
      if (stats.isDirectory()) {
        return directoryPath;
      }
    } catch {
      // continue to next candidate
    }
  }
  return undefined;
}

async function notifyDownloadsEmpty(): Promise<void> {
  await showToast(Toast.Style.Success, "Downloads empty");
}

async function filterPathsThatExist(paths: string[]): Promise<string[]> {
  const existing: string[] = [];
  for (const filePath of paths) {
    try {
      await fs.stat(filePath);
      existing.push(filePath);
    } catch {
      // does not exist; skip
    }
  }
  return existing;
}

async function sendToRecycleBinWindows(paths: string[]): Promise<void> {
  const execFile = promisify(execFileCb);
  const powershellExe = "powershell"; // PowerShell 5+ or pwsh should both work with Microsoft.VisualBasic

  // Process files/directories one by one to avoid command-length limits
  for (const filePath of paths) {
    const escaped = filePath.replace(/'/g, "''");
    const isDirectory = await isDirectoryPath(filePath);
    const command = isDirectory
      ? `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory('${escaped}', 'OnlyErrorDialogs', 'SendToRecycleBin')`
      : `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${escaped}', 'OnlyErrorDialogs', 'SendToRecycleBin')`;
    try {
      await execFile(powershellExe, ["-NoProfile", "-NonInteractive", "-Command", command]);
    } catch {
      // ignore and continue to next path
    }
  }
}

async function isDirectoryPath(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}
