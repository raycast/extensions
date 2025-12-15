import fs from "fs";
import path from "path";
import os from "os";
import ini from "ini";
import lz4js from "lz4js";

interface FirefoxTab {
  entries: { url: string; title?: string }[];
  index: number; // 1-based index of active entry
}

interface FirefoxWindow {
  tabs: FirefoxTab[];
}

interface FirefoxSession {
  windows: FirefoxWindow[];
}

export function getFirefoxTabs(): string[] {
  try {
    const homeDir = os.homedir();
    const firefoxDir = path.join(
      homeDir,
      "Library",
      "Application Support",
      "Firefox",
    );
    const profilesIniPath = path.join(firefoxDir, "profiles.ini");

    if (!fs.existsSync(profilesIniPath)) {
      console.log("Firefox profiles.ini not found");
      return [];
    }

    const profilesData = ini.parse(fs.readFileSync(profilesIniPath, "utf-8"));

    // Find default profile
    let profilePath = "";

    // Handle both new and old profiles.ini formats
    // New format has [Install...] sections, old has [Profile0], [Profile1]...
    // We look for a profile with Default=1 or just pick the first one if not found.
    // Usually there is a "Path" property.

    // Flatten the sections to find one with Default=1
    for (const key in profilesData) {
      if (key.startsWith("Profile")) {
        const profile = profilesData[key];
        if (profile.Default === "1" || profile.Default === 1) {
          profilePath = profile.Path;
          if (profile.IsRelative === "1" || profile.IsRelative === 1) {
            profilePath = path.join(firefoxDir, profilePath);
          }
          break;
        }
      }
    }

    // Fallback: if no Default=1, try to find any profile that looks like a default
    if (!profilePath) {
      // Try to find a section with Name=default-release or similar
      for (const key in profilesData) {
        if (key.startsWith("Profile")) {
          const profile = profilesData[key];
          if (
            profile.Path &&
            (profile.Path.includes(".default") || profile.Name === "default")
          ) {
            profilePath = profile.Path;
            if (profile.IsRelative === "1" || profile.IsRelative === 1) {
              profilePath = path.join(firefoxDir, profilePath);
            }
            break;
          }
        }
      }
    }

    if (!profilePath || !fs.existsSync(profilePath)) {
      console.log("Could not find valid Firefox profile path");
      return [];
    }

    const recoveryPath = path.join(
      profilePath,
      "sessionstore-backups",
      "recovery.jsonlz4",
    );

    if (!fs.existsSync(recoveryPath)) {
      console.log("recovery.jsonlz4 not found");
      return [];
    }

    const fileBuffer = fs.readFileSync(recoveryPath);

    // Check magic header: mozLz40\0 (8 bytes)
    const magic = fileBuffer.subarray(0, 8).toString("utf8");
    if (magic !== "mozLz40\0") {
      console.log("Invalid magic header in recovery.jsonlz4");
      return [];
    }

    const compressed = fileBuffer.subarray(8);
    const decompressed = lz4js.decompress(compressed);
    const jsonString = Buffer.from(decompressed).toString("utf8");

    const session: FirefoxSession = JSON.parse(jsonString);
    const urls: string[] = [];

    // Extract URLs from all windows and tabs
    for (const window of session.windows) {
      for (const tab of window.tabs) {
        // tab.entries is history for that tab. tab.index is the current position (1-based)
        const activeEntryIndex = (tab.index || 1) - 1;
        if (tab.entries && tab.entries[activeEntryIndex]) {
          const url = tab.entries[activeEntryIndex].url;
          if (url) {
            urls.push(url);
          }
        }
      }
    }

    return urls;
  } catch (e) {
    console.error("Error reading Firefox session:", e);
    return [];
  }
}
