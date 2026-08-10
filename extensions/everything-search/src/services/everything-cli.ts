import { confirmAlert, showToast, Toast } from "@raycast/api";
import { stat } from "fs/promises";
import { basename } from "path";
import { promisify } from "util";
import { exec } from "child_process";
import { FileInfo, Preferences } from "../types";
import { downloadCli } from "../utils/download-cli";

const execAsync = promisify(exec);

// Tracks whether a download attempt has already been made this session.
let cliDownloadAttempted = false;

export async function searchFilesWithCLI(searchText: string, preferences: Preferences): Promise<FileInfo[]> {
  if (!searchText) {
    return [];
  }

  const { esExePath, defaultSort, maxResults, customCliArgs, useRegex } = preferences;

  try {
    const esCommand = esExePath || "es.exe";
    const maxResultsCount = Number(maxResults) || 100;

    const cliArgs = `${customCliArgs?.trim() || ""}${useRegex ? " -r" : ""}`;

    // Use es.exe with CSV output format to get file info in one call
    const command = `chcp 65001 > nul && "${esCommand}" -csv -n ${maxResultsCount} -name -filename-column -size -date-created -date-modified ${defaultSort} ${cliArgs} ${searchText}`;

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
          dateCreated: Date.parse(dateCreatedStr) ? new Date(dateCreatedStr) : undefined,
          dateModified: Date.parse(dateModifiedStr) ? new Date(dateModifiedStr) : undefined,
          isDirectory,
        };
      }),
    );
    return results;
  } catch (error) {
    const errorCode = error && typeof error === "object" && "code" in error ? error.code : undefined;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const hasStderr = error && typeof error === "object" && "stderr" in error;
    const stderr = hasStderr ? String(error.stderr) : "";

    const isNotFound =
      errorCode === 1 ||
      stderr.includes("not recognized") ||
      stderr.includes("command not found") ||
      errorMessage.includes("not recognized");

    if (isNotFound) {
      if (esExePath) {
        // User configured a custom path that doesn't work
        await showToast({
          style: Toast.Style.Failure,
          title: "Custom es.exe path not found",
          message: `Cannot find es.exe at: ${esExePath}`,
        });
      } else if (!cliDownloadAttempted) {
        // es.exe not in PATH — offer to download it
        cliDownloadAttempted = true;

        const shouldDownload = await confirmAlert({
          title: "ES CLI Not Found",
          message:
            "Everything's command-line tool (es.exe) was not found.\n\n" +
            "Would you like to download and install it from GitHub?",
          primaryAction: { title: "Download" },
          dismissAction: { title: "Cancel" },
        });

        if (shouldDownload) {
          const installedPath = await downloadCli();
          if (installedPath) {
            // Retry the search with the newly installed es.exe
            return searchFilesWithCLI(searchText, { ...preferences, esExePath: installedPath });
          }
        }
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "'es.exe' not found",
          message: "Please ensure Everything's command-line tool is in your PATH or set a custom path in preferences.",
        });
      }
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
