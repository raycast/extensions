import { getPreferenceValues } from "@raycast/api";
import { DebugInfo, Tab, Preferences } from "../types";
import fs from "fs";
import path from "path";
import os from "os";

// Import the new utility modules
import { formatError } from "./common/errorUtils";
import { validateExecutablePath, SESSION_FILE_PATHS } from "./common/pathUtils";
import { isRunning } from "./browserUtils";
import { findSessionFile, parseSessionYaml } from "./sessionManager";

export async function fetchQutebrowserTabs(): Promise<Tab[]> {
  const debugInfo: DebugInfo = {
    locations_checked: [],
    files_found: [],
    errors: [],
  };

  // Check if background process already determined qutebrowser is not running
  try {
    const notRunningMarker = path.join(os.tmpdir(), "raycast_qutebrowser_not_running");
    if (fs.existsSync(notRunningMarker)) {
      try {
        const stats = fs.statSync(notRunningMarker);
        const fileAge = Date.now() - stats.mtime.getTime();
        const isFresh = fileAge < 5000; // 5 seconds

        if (isFresh) {
          debugInfo.qutebrowser_running = false;
          debugInfo.errors.push("Qutebrowser not running (marker file found)");
          throw new Error("Qutebrowser is not running. Please start qutebrowser first.");
        } else {
          // Marker file is too old, remove it and continue with normal check
          fs.unlinkSync(notRunningMarker);
          debugInfo.note = "Removed stale not-running marker file";
        }
      } catch (e) {
        debugInfo.errors.push(`Marker file error: ${formatError(e)}`);
        console.error("Error checking not-running marker:", e);
      }
    }
  } catch (e) {
    debugInfo.errors.push(`Temp directory error: ${formatError(e)}`);
    console.error("Error accessing tmp directory:", e);
  }

  const qutebrowserRunning = await isRunning();
  debugInfo.qutebrowser_running = qutebrowserRunning;

  if (!qutebrowserRunning) {
    throw new Error("Qutebrowser is not running. Please start qutebrowser first.");
  }

  const preferences = getPreferenceValues<Preferences>();
  const qutebrowserPath = preferences.qutebrowserPath || "/opt/homebrew/bin/qutebrowser";
  debugInfo.qutebrowser_path = qutebrowserPath;

  // Check if the qutebrowser executable exists
  try {
    validateExecutablePath(qutebrowserPath);
  } catch (e) {
    debugInfo.errors.push(`Qutebrowser executable not found at "${qutebrowserPath}"`);
    throw e;
  }

  // Check if SESSION_FILE_PATHS array has any entries
  if (SESSION_FILE_PATHS.length === 0) {
    debugInfo.errors.push("No session file paths defined");
    debugInfo.note = "Could not find any session file paths. Configuration issue.";
  } else {
    const mainAutoSavePath = SESSION_FILE_PATHS[0];
    if (fs.existsSync(mainAutoSavePath)) {
      try {
        const stats = fs.statSync(mainAutoSavePath);
        const fileAge = Date.now() - stats.mtime.getTime();
        const ageInSeconds = Math.round(fileAge / 1000);

        debugInfo.autosave_path = mainAutoSavePath;
        debugInfo.autosave_exists = true;
        debugInfo.autosave_size = stats.size;
        debugInfo.autosave_modified = stats.mtime.toISOString();

        console.log(`Found autosave file: ${mainAutoSavePath} (${ageInSeconds}s old, ${stats.size} bytes)`);
      } catch (e) {
        console.error("Error checking autosave file:", e);
        debugInfo.errors.push(`Autosave check error: ${formatError(e)}`);
      }
    } else {
      debugInfo.autosave_exists = false;
      debugInfo.note = "No auto-saved session file found. Is qutebrowser configured to auto-save sessions?";
    }
  }

  const content = findSessionFile(debugInfo);
  let tabs: Tab[] = [];

  if (content) {
    try {
      tabs = parseSessionYaml(content);
    } catch (e) {
      debugInfo.errors.push(`Failed to parse session YAML: ${formatError(e)}`);
      console.error("Error parsing session YAML:", e);
    }
    if (tabs.length > 0) {
      debugInfo.tabs_found = tabs.length;
      console.log(`Found ${tabs.length} tabs`);
    } else {
      debugInfo.errors.push("No tabs found");
    }
  }

  if (tabs.length === 0) {
    debugInfo.qutebrowser_running = await isRunning();
    tabs = [
      {
        window: 0,
        index: 0,
        url: "https://qutebrowser.org",
        title: "No tabs found",
        active: true,
      },
    ];
  }

  return tabs;
}
