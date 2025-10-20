import { showToast, Toast, getPreferenceValues, Clipboard } from "@raycast/api";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

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
    await showToast(Toast.Style.Failure, "Downloads folder not found");
    return;
  }

  const entryNames = await fs.readdir(downloadsDirectory).catch(() => [] as string[]);
  if (entryNames.length === 0) {
    await showToast(Toast.Style.Failure, "Downloads folder is empty");
    return;
  }

  // Get file stats for all entries to find the most recent one
  const entries: Array<{ name: string; path: string; mtime: Date }> = [];
  for (const entryName of entryNames) {
    const entryPath = path.join(downloadsDirectory, entryName);
    try {
      const stats = await fs.stat(entryPath);
      entries.push({
        name: entryName,
        path: entryPath,
        mtime: stats.mtime,
      });
    } catch {
      // Skip entries that can't be accessed
    }
  }

  if (entries.length === 0) {
    await showToast(Toast.Style.Failure, "No accessible files found");
    return;
  }

  // Sort by modification time (most recent first)
  entries.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  const latestEntry = entries[0];

  // Copy the file path to clipboard (Windows Explorer style)
  try {
    await Clipboard.copy({ file: latestEntry.path });
    await showToast(Toast.Style.Success, "Copied to clipboard", latestEntry.name);
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to copy file", String(error));
  }
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
