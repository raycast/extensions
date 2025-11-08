import { open, LocalStorage } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

interface HistoryItem {
  query: string;
  timestamp: number;
}

const HISTORY_KEY = "brave-search-history";

async function loadHistory(): Promise<HistoryItem[]> {
  try {
    const historyJson = await LocalStorage.getItem(HISTORY_KEY);
    if (historyJson) {
      const parsed = JSON.parse(historyJson as string);

      // Migration: Check if old format (string[]) and convert to new format
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (typeof parsed[0] === "string") {
          // Old format: convert to new format with current timestamp
          const migrated: HistoryItem[] = parsed.map((query: string) => ({
            query,
            timestamp: Date.now(),
          }));
          // Save migrated data
          await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(migrated));
          // Sort by timestamp descending (most recent first)
          return migrated.sort((a, b) => b.timestamp - a.timestamp);
        } else if (typeof parsed[0] === "object" && "query" in parsed[0] && "timestamp" in parsed[0]) {
          // New format: already migrated
          // Sort by timestamp descending (most recent first)
          return parsed.sort((a: HistoryItem, b: HistoryItem) => b.timestamp - a.timestamp);
        }
      }
    }
  } catch (error) {
    console.error("Error loading history:", error);
  }
  return [];
}

async function saveToHistory(query: string, maxItems: number): Promise<void> {
  try {
    let history = await loadHistory();

    // Remove duplicate if exists
    history = history.filter((item) => item.query !== query);

    // Add new item with current timestamp at the beginning
    history.unshift({
      query,
      timestamp: Date.now(),
    });

    // Limit to maxItems
    history = history.slice(0, maxItems);

    // Sort by timestamp descending (most recent first)
    history.sort((a, b) => b.timestamp - a.timestamp);

    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Error saving to history:", error);
  }
}

export async function performSearch(
  query: string,
  searchUrl: string,
  maxHistoryItems: number,
  openMode: "default" | "new-tab" | "new-window" = "default",
): Promise<void> {
  if (!query.trim()) return;

  const encodedQuery = encodeURIComponent(query);
  const url = `${searchUrl}${encodedQuery}`;

  // Save to history
  await saveToHistory(query, maxHistoryItems);

  // Open URL in Brave
  // On Windows, try to open with Brave specifically
  const execAsync = promisify(exec);

  // Determine the flag based on openMode
  let braveFlag = "";
  if (openMode === "new-tab") {
    braveFlag = "--new-tab";
  } else if (openMode === "new-window") {
    braveFlag = "--new-window";
  }

  try {
    // Try to open with Brave using the brave:// protocol
    // or by searching for the Brave executable
    if (braveFlag) {
      await execAsync(`start brave ${braveFlag} "${url}"`);
    } else {
      await execAsync(`start brave "${url}"`);
    }
  } catch {
    try {
      // Try with common Brave paths on Windows
      const homeDir = os.homedir();
      const localAppData = process.env.LOCALAPPDATA || `${homeDir}\\AppData\\Local`;
      const programFiles = process.env.PROGRAMFILES || "C:\\Program Files";
      const programFilesX86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";

      const bravePaths = [
        `${localAppData}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
        `${programFiles}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
        `${programFilesX86}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
      ];

      let opened = false;
      for (const bravePath of bravePaths) {
        try {
          if (braveFlag) {
            await execAsync(`"${bravePath}" ${braveFlag} "${url}"`);
          } else {
            await execAsync(`"${bravePath}" "${url}"`);
          }
          opened = true;
          break;
        } catch {
          // Continue with next path
        }
      }

      if (!opened) {
        // Fallback: use Raycast API to open in default browser
        await open(url);
      }
    } catch {
      // Last resort: use Raycast API
      await open(url);
    }
  }
}
