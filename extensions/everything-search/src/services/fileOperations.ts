import { open, showToast, Toast, Clipboard } from "@raycast/api";
import { readdir, stat } from "fs/promises";
import { dirname, join } from "path";
import { isExecutableFile } from "../utils/file";
import { FileInfo, Preferences } from "../types";
import { promisify } from "util";
import { exec, execFile } from "child_process";
import { searchFilesWithCLI } from "./everything-cli";
import { searchFilesWithSDK } from "./everything-sdk";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export async function loadFilesList(searchText: string, preferences: Preferences): Promise<FileInfo[]> {
  if (!searchText) {
    return [];
  }

  if (preferences.useSdk) {
    return searchFilesWithSDK(searchText, preferences);
  } else {
    return searchFilesWithCLI(searchText, preferences);
  }
}

export async function openFileFound(fileInfo: FileInfo) {
  try {
    await open(fileInfo.commandline);
    await showToast({
      style: Toast.Style.Success,
      title: "Opening File",
      message: `Opened ${fileInfo.name}`,
    });
  } catch (error) {
    // if the error is related to permissions, run as administrator
    if (
      error instanceof Error &&
      (error.message.includes("The requested operation requires elevation.") ||
        error.message.includes("请求的操作需要提升。")) &&
      isExecutableFile(fileInfo.commandline)
    ) {
      await runAsAdministrator(fileInfo.commandline);
      return;
    }

    console.log(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error Opening File",
      message: `Failed to open ${fileInfo.name}`,
    });
  }
}

export async function runAsAdministrator(path: string) {
  const command = `powershell -Command "Start-Process -FilePath '${path.replace(/'/g, "''")}' -Verb RunAs"`;
  execAsync(command);
}

export async function showInExplorer(path: string, preferences: Preferences) {
  const { fileExplorerCommand } = preferences;
  // For files, show the containing directory; for directories, show the directory itself
  const targetPath = dirname(path);

  if (fileExplorerCommand) {
    try {
      const commandParts = fileExplorerCommand.match(/"[^"]+"|\S+/g) || [];
      if (commandParts.length === 0) {
        throw new Error("File explorer command is invalid.");
      }

      const executable = commandParts[0]!.replace(/"/g, "");
      const args = commandParts.slice(1).map((arg: string) => arg.replace("%s", targetPath));

      await execFileAsync(executable, args);
    } catch (error) {
      console.log(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Opening in Custom Explorer",
        message: error instanceof Error ? error.message : `Failed to execute: ${fileExplorerCommand}`,
      });
    }
  } else {
    await open(targetPath);
  }
}

export async function copyFileWithApi(fileInfo: FileInfo) {
  try {
    await Clipboard.copy({ file: fileInfo.commandline });
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to Clipboard",
      message: `Copied ${fileInfo.name}`,
    });
  } catch (error) {
    console.log(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error Copying File",
      message: "Could not copy the file to the clipboard.",
    });
  }
}

export async function loadDirectoryContents(dirPath: string): Promise<FileInfo[]> {
  try {
    const entries = await readdir(dirPath);
    const results: FileInfo[] = [];

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      try {
        const stats = await stat(fullPath);
        results.push({
          name: entry,
          commandline: fullPath,
          size: stats.isFile() ? stats.size : undefined,
          dateCreated: stats.birthtime,
          dateModified: stats.mtime,
          isDirectory: stats.isDirectory(),
        });
      } catch (error) {
        // Skip entries we can't access
        console.log(`Skipping ${fullPath}: ${error}`);
      }
    }

    // Sort directories first, then files
    return results.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.log(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error Reading Directory",
      message: error instanceof Error ? error.message : "Failed to read directory contents",
    });
    return [];
  }
}
