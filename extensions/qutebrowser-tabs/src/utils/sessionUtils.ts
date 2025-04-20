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
    const autoSavePath = SESSION_FILE_PATHS[0];

    debugInfo.locations_checked.push(autoSavePath);

    try {
      if (fs.existsSync(autoSavePath)) {
        debugInfo.files_found.push(autoSavePath);
        debugInfo.success_file = autoSavePath;

        const stats = fs.statSync(autoSavePath);
        debugInfo.success_file_size = stats.size;
        debugInfo.success_file_mtime = stats.mtime.toISOString();

        const fileAge = Date.now() - stats.mtime.getTime();
        debugInfo.autosave_age = `${Math.round(fileAge / 1000)}s`;

        const content = fs.readFileSync(autoSavePath, "utf-8");
        return content;
      } else {
        debugInfo.errors.push(
          `Primary autosave file not found: ${autoSavePath}`,
        );
      }
    } catch (e) {
      debugInfo.errors.push(
        `Error reading autosave file: ${SessionUtils.formatError(e)}`,
      );
    }

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
    await execPromise(`"${qutebrowserPath}" "${command}"`);
  },
};

export default SessionUtils;
