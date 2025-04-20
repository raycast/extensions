import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import util from "util";
import YAML from "yaml";
import { Tab, DebugInfo, SessionData } from "../types";

const execPromise = util.promisify(exec);

export const SESSION_FILE_PATHS = [
  path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "qutebrowser",
    "sessions",
    "_autosave.yml",
  ),
  path.join(os.homedir(), ".qutebrowser", "sessions", "_autosave.yml"),
  path.join(
    os.homedir(),
    ".local",
    "share",
    "qutebrowser",
    "sessions",
    "_autosave.yml",
  ),
];
export const QUTEBROWSER_PROCESS_CHECK =
  "ps aux | grep -v grep | grep qutebrowser";

const SessionUtils = {
  isRunning: async (): Promise<boolean> => {
    try {
      const psResult = await execPromise(QUTEBROWSER_PROCESS_CHECK);
      return psResult.stdout.trim().length > 0;
    } catch (e) {
      return false;
    }
  },

  formatError: (error: unknown): string => {
    return error instanceof Error ? error.message : String(error);
  },

  findSessionFile: (debugInfo: DebugInfo): string | null => {
    // Try all possible session file paths
    for (const filePath of SESSION_FILE_PATHS) {
      try {
        debugInfo.locations_checked.push(filePath);

        if (fs.existsSync(filePath)) {
          debugInfo.files_found.push(filePath);

          try {
            const stats = fs.statSync(filePath);
            const fileAge = Date.now() - stats.mtime.getTime();
            const ageInSeconds = Math.round(fileAge / 1000);

            // If this is the first file found, store more details about it
            if (!debugInfo.success_file) {
              debugInfo.success_file = filePath;
              debugInfo.success_file_size = stats.size;
              debugInfo.success_file_mtime = stats.mtime.toISOString();
              debugInfo.autosave_age = `${ageInSeconds}s`;
            }

            const content = fs.readFileSync(filePath, "utf-8");
            return content;
          } catch (statError) {
            debugInfo.errors.push(
              `Error reading stats for ${filePath}: ${SessionUtils.formatError(statError)}`,
            );
          }
        }
      } catch (fileError) {
        debugInfo.errors.push(
          `Error checking file ${filePath}: ${SessionUtils.formatError(fileError)}`,
        );
      }
    }

    // If we get here, no session files were found
    debugInfo.errors.push(
      `No session files found in any of the expected locations`,
    );
    return null;
  },

  parseSessionYaml: (content: string): Tab[] => {
    try {
      const sessionData = YAML.parse(content) as SessionData;
      const tabs: Tab[] = [];

      if (sessionData?.windows) {
        sessionData.windows.forEach((window, windowIdx: number) => {
          if (window.tabs) {
            window.tabs.forEach((tab, tabIdx: number) => {
              if (tab.history?.length > 0) {
                const activeHistoryEntry = tab.history.find(
                  (entry) => entry.active,
                );
                const currentEntry =
                  activeHistoryEntry || tab.history[tab.history.length - 1];

                tabs.push({
                  window: windowIdx,
                  index: tabIdx,
                  url: currentEntry.url || "",
                  title: currentEntry.title || "Untitled",
                  active: tab.active || false,
                  pinned: currentEntry.pinned || false,
                });
              }
            });
          }
        });
      }

      console.log(`Parsed ${tabs.length} tabs from session file`);
      return tabs;
    } catch (e) {
      console.error("Error parsing YAML:", SessionUtils.formatError(e));
      return [];
    }
  },

  executeCommand: async (
    qutebrowserPath: string,
    command: string,
  ): Promise<void> => {
    try {
      // Sanitize the paths and command to prevent command injection
      const safePath = qutebrowserPath.replace(/"/g, '\\"');
      const safeCommand = command.replace(/"/g, '\\"');
      await execPromise(`"${safePath}" "${safeCommand}"`);
    } catch (error) {
      console.error("Error executing qutebrowser command:", error);
      throw error; // Re-throw to let callers handle specific errors
    }
  },
};

export default SessionUtils;
