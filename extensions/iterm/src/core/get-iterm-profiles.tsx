import { execFileSync } from "child_process";
import { homedir } from "os";
import { join } from "path";

export interface ItermProfile {
  name: string;
  guid: string;
}

type ItermPreferences = {
  "New Bookmarks"?: unknown;
};

type ItermProfileEntry = {
  Name?: unknown;
  Guid?: unknown;
};

function isItermProfileEntry(entry: unknown): entry is ItermProfileEntry {
  return typeof entry === "object" && entry !== null;
}

export function getItermProfiles(): ItermProfile[] {
  const plistPath = join(homedir(), "Library/Preferences/com.googlecode.iterm2.plist");

  try {
    const output = execFileSync("/usr/bin/plutil", ["-convert", "json", "-o", "-", plistPath], {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
    const preferences = JSON.parse(output) as ItermPreferences;
    const bookmarks = preferences["New Bookmarks"];

    if (!Array.isArray(bookmarks)) {
      return [];
    }

    return bookmarks.flatMap((entry) => {
      if (!isItermProfileEntry(entry)) {
        return [];
      }

      const name = typeof entry.Name === "string" ? entry.Name.trim() : "";
      const guid = typeof entry.Guid === "string" ? entry.Guid.trim() : "";

      return name && guid ? [{ name, guid }] : [];
    });
  } catch (error) {
    console.error("Failed to read iTerm profiles:", error);
    return [];
  }
}
