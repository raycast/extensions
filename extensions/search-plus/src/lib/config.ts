import { environment } from "@raycast/api";
import path from "path";
import fs from "fs";

export const DB_PATH = path.join(environment.assetsPath, "search-plus.db");
const PREFS_FILE = path.join(environment.supportPath, "preferences.json");

export function readPreferences(): { defaultSearchEngine: string } {
  try {
    if (fs.existsSync(PREFS_FILE)) {
      const data = fs.readFileSync(PREFS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to read preferences:", error);
  }
  return { defaultSearchEngine: "g" };
}

export function writePreferences(prefs: { defaultSearchEngine: string }): void {
  try {
    fs.writeFileSync(PREFS_FILE, JSON.stringify(prefs, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to write preferences:", error);
    throw error;
  }
}
