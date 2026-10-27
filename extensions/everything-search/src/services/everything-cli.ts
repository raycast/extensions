import { Clipboard, confirmAlert, showToast, Toast } from "@raycast/api";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { readFile, rm, stat } from "fs/promises";
import { tmpdir } from "os";
import { basename, dirname, join } from "path";
import { FileInfo, Preferences } from "../types";
import { execFileAsync } from "../utils/command";
import { downloadCli } from "../utils/download-cli";

// Tracks whether a download attempt has already been made this session.
let cliDownloadAttempted = false;

// Splits text into es.exe arguments on whitespace, keeping quoted parts such as path:"C:\Program Files" together.
function splitArgs(text: string): string[] {
  return text.match(/(?:[^\s"]+|"[^"]*"?)+/g) ?? [];
}

// Quotes the leading "-" of search terms so es.exe does not read them as switches. Only the dash is quoted,
// so terms that contain quotes themselves, like -report" final", keep working.
function toSearchArgs(searchText: string): string[] {
  return splitArgs(searchText).map((arg) => (arg.startsWith("-") ? `"-"${arg.slice(1)}` : arg));
}

export async function searchFilesWithCLI(searchText: string, preferences: Preferences): Promise<FileInfo[]> {
  if (!searchText) {
    return [];
  }

  const { esExePath, defaultSort, maxResults, customCliArgs, useRegex } = preferences;

  try {
    const maxResultsCount = Number(maxResults) || 100;

    const cliArgs = `${customCliArgs?.trim() || ""}${useRegex ? " -r" : ""}`;

    // es.exe prints results in the console code page, which garbles non-ASCII file names, but its
    // CSV export is always UTF-8. So the results are exported to a temporary file and read back.
    const csvPath = join(tmpdir(), `everything-search-${randomUUID()}.csv`);

    // Use es.exe with CSV output format to get file info in one call
    const args = [
      "-export-csv",
      `"${csvPath}"`,
      "-n",
      String(maxResultsCount),
      "-name",
      "-filename-column",
      "-size",
      "-date-created",
      "-date-modified",
      ...splitArgs(defaultSort || ""),
      ...splitArgs(cliArgs),
      ...toSearchArgs(searchText),
    ];

    if (esExePath && !existsSync(esExePath)) {
      throw Object.assign(new Error(`Cannot find es.exe at: ${esExePath}`), { code: "ENOENT" });
    }

    // Run es.exe directly instead of through cmd.exe, so characters like & | < > in the search
    // text are not treated as shell syntax. The arguments are passed verbatim because es.exe parses
    // its own command line and would not understand Node's \" escaping of quoted search terms.
    // Verbatim mode also leaves the program path unquoted, so a custom es.exe is started from its
    // own folder by file name, which keeps a path with spaces out of the command line.
    let csv: string;
    try {
      await execFileAsync(esExePath ? basename(esExePath) : "es.exe", args, {
        cwd: esExePath ? dirname(esExePath) : undefined,
        windowsVerbatimArguments: true,
      });
      csv = await readFile(csvPath, "utf8");
    } finally {
      await rm(csvPath, { force: true });
    }

    const lines = csv
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
    // es.exe exits with code 8 ("Everything IPC not found") when the Everything app is not running
    const isEverythingNotRunning = errorCode === 8 || stderr.includes("Everything IPC");

    // es.exe is started without a shell, so a missing executable fails with ENOENT
    const isNotFound = errorCode === "ENOENT";

    if (isEverythingNotRunning) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Everything is not running",
        message: "Please make sure the Everything app is running.",
        primaryAction: {
          title: "Copy Error",
          onAction: () => {
            Clipboard.copy(errorMessage);
          },
        },
      });
    } else if (isNotFound) {
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
        primaryAction: {
          title: "Copy Error",
          onAction: () => {
            Clipboard.copy(errorMessage);
          },
        },
      });
    }
    return [];
  }
}
