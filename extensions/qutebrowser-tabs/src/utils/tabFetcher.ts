import { getPreferenceValues } from "@raycast/api";
import { DebugInfo, Tab, Preferences } from "../types";
import SessionUtils, { SESSION_FILE_PATHS } from "./sessionUtils";
import fs from "fs";
import path from "path";
import os from "os";

export async function fetchQutebrowserTabs(): Promise<Tab[]> {
  const debugInfo: DebugInfo = {
    locations_checked: [],
    files_found: [],
    errors: [],
  };

  // Check if background process already determined qutebrowser is not running
  const notRunningMarker = path.join(
    os.tmpdir(),
    "raycast_qutebrowser_not_running",
  );
  if (fs.existsSync(notRunningMarker)) {
    try {
      const stats = fs.statSync(notRunningMarker);
      const fileAge = Date.now() - stats.mtime.getTime();
      const isFresh = fileAge < 5000; // 5 seconds

      if (isFresh) {
        debugInfo.qutebrowser_running = false;
        throw new Error(
          "Qutebrowser is not running. Please start qutebrowser first.",
        );
      } else {
        // Marker file is too old, remove it and continue with normal check
        fs.unlinkSync(notRunningMarker);
      }
    } catch (e) {
      console.error("Error checking not-running marker:", e);
    }
  }

  const qutebrowserRunning = await SessionUtils.isRunning();
  debugInfo.qutebrowser_running = qutebrowserRunning;

  if (!qutebrowserRunning) {
    throw new Error(
      "Qutebrowser is not running. Please start qutebrowser first.",
    );
  }

  const preferences = getPreferenceValues<Preferences>();
  const qutebrowserPath =
    preferences.qutebrowserPath || "/opt/homebrew/bin/qutebrowser";
  debugInfo.qutebrowser_path = qutebrowserPath;

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

      console.log(
        `Found autosave file: ${mainAutoSavePath} (${ageInSeconds}s old, ${stats.size} bytes)`,
      );
    } catch (e) {
      console.error("Error checking autosave file:", e);
      debugInfo.errors.push(`Autosave check error: ${e}`);
    }
  } else {
    debugInfo.autosave_exists = false;
    debugInfo.note =
      "No auto-saved session file found. Is qutebrowser configured to auto-save sessions?";
  }

  const content = SessionUtils.findSessionFile(debugInfo);
  let tabs: Tab[] = [];

  if (content) {
    tabs = SessionUtils.parseSessionYaml(content);

    if (tabs.length > 0) {
      debugInfo.tabs_found = tabs.length;
      console.log(`Found ${tabs.length} tabs`);
    } else {
      debugInfo.errors.push("No tabs found");
    }
  }

  if (tabs.length === 0) {
    debugInfo.qutebrowser_running = await SessionUtils.isRunning();
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
