/**
 * Utilities for managing qutebrowser session files
 */
import fs from "fs";
import YAML from "yaml";
import { Tab, DebugInfo, SessionData } from "../types";
import { formatError } from "./common/errorUtils";
import { SESSION_FILE_PATHS } from "./common/pathUtils";

/**
 * Find and read a valid session file
 * @param debugInfo Object to collect debug information
 * @returns Session file content or null if not found
 */
export function findSessionFile(debugInfo: DebugInfo): string | null {
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
          debugInfo.errors.push(`Error reading stats for ${filePath}: ${formatError(statError)}`);
        }
      }
    } catch (fileError) {
      debugInfo.errors.push(`Error checking file ${filePath}: ${formatError(fileError)}`);
    }
  }

  // If we get here, no session files were found
  debugInfo.errors.push(`No session files found in any of the expected locations`);
  return null;
}

/**
 * Parse session YAML content into tab objects
 * @param content YAML content from session file
 * @returns Array of Tab objects
 */
export function parseSessionYaml(content: string): Tab[] {
  try {
    const sessionData = YAML.parse(content) as SessionData;
    const tabs: Tab[] = [];

    if (sessionData?.windows) {
      sessionData.windows.forEach((window, windowIdx: number) => {
        if (window.tabs) {
          window.tabs.forEach((tab, tabIdx: number) => {
            if (tab.history?.length > 0) {
              const activeHistoryEntry = tab.history.find((entry) => entry.active);
              const currentEntry = activeHistoryEntry || tab.history[tab.history.length - 1];

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
    console.error("Error parsing YAML:", formatError(e));
    return [];
  }
}
