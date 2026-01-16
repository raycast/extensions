import { open, showToast, Toast, Clipboard } from "@raycast/api";
import { readdir, stat } from "fs/promises";
import { basename, dirname, join } from "path";
import { isExecutableFile, parseEsDate } from "../utils/file";
import { FileInfo, Preferences } from "../types";
import { promisify } from "util";
import { exec, execFile } from "child_process";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export async function loadFilesList(searchText: string, preferences: Preferences): Promise<FileInfo[]> {
  if (!searchText) {
    return [];
  }

  const { esExePath, defaultSort } = preferences;

  try {
    const esCommand = esExePath || "es.exe";

    // Use es.exe with CSV output format to get file info in one call
    const command = `chcp 65001 > nul && "${esCommand}" -n 100 -csv -name -filename-column -size -date-created -date-modified ${defaultSort} ${searchText}`;

    const { stdout } = await execAsync(command);

    const lines = stdout
      .trim()
      .split(/\r?\n/)
      .filter((line) => line);

    // Skip header line and parse CSV data
    const dataLines = lines.slice(1);

    const results = await Promise.all(
      dataLines.map(async (line) => {
        // Parse CSV line (handle quoted values that may contain commas)
        const csvRegex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
        const values: string[] = [];
        let match;

        while ((match = csvRegex.exec(line)) !== null) {
          values.push(match[1] || match[2] || "");
        }

        if (values.length < 5) {
          // Fallback if CSV parsing fails
          const fullPath = values[0] || line;
          // Check if it's a directory
          let isDirectory = false;
          try {
            const stats = await stat(fullPath);
            isDirectory = stats.isDirectory();
          } catch {
            // If stat fails, assume it's a file
          }
          return {
            name: basename(fullPath),
            commandline: fullPath,
            isDirectory,
          };
        }

        const [fileName, fullPath, sizeStr, dateCreatedStr, dateModifiedStr] = values;

        // Check if it's a directory
        let isDirectory = false;
        try {
          const stats = await stat(fullPath);
          isDirectory = stats.isDirectory();
        } catch {
          // If stat fails, assume it's a file
        }

        return {
          name: fileName || basename(fullPath),
          commandline: fullPath,
          size: sizeStr && !isDirectory ? parseInt(sizeStr, 10) : undefined,
          dateCreated: parseEsDate(dateCreatedStr),
          dateModified: parseEsDate(dateModifiedStr),
          isDirectory,
        };
      }),
    );
    return results;
  } catch (error) {
    console.log(error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const hasStderr = error && typeof error === "object" && "stderr" in error;
    const stderr = hasStderr ? String(error.stderr) : "";

    // Check if es.exe command is not recognized (Windows) or not found (Unix-like)
    if (
      stderr.includes("not recognized") ||
      stderr.includes("command not found") ||
      errorMessage.includes("not recognized")
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: esExePath ? "Custom es.exe path not found" : "'es.exe' not found",
        message: esExePath
          ? `Cannot find es.exe at: ${esExePath}`
          : "Please ensure Everything's command-line tool is in your system's PATH or set a custom path in preferences.",
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Searching Files",
        message: errorMessage,
      });
    }
    return [];
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
