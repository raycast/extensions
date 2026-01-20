import { execSync } from "child_process";
import { homedir } from "os";
import { join } from "path";

export interface ItermProfile {
  name: string;
  guid: string;
}

export function getItermProfiles(): ItermProfile[] {
  const plistPath = join(homedir(), "Library/Preferences/com.googlecode.iterm2.plist");

  try {
    // Get all profile names and GUIDs using PlistBuddy
    const output = execSync(
      `/usr/libexec/PlistBuddy -c "Print :New\\ Bookmarks" "${plistPath}" 2>/dev/null | grep -E "Name =|Guid ="`,
      { encoding: "utf-8" },
    );

    const lines = output.trim().split("\n");
    const profiles: ItermProfile[] = [];

    // Lines come in pairs: Guid first, then Name. Guid for unique identification
    for (let i = 0; i < lines.length; i += 2) {
      const guidLine = lines[i];
      const nameLine = lines[i + 1];

      if (guidLine && nameLine) {
        const guidMatch = guidLine.match(/Guid\s*=\s*(.+)/);
        const nameMatch = nameLine.match(/Name\s*=\s*(.+)/);

        if (nameMatch && guidMatch) {
          profiles.push({
            name: nameMatch[1].trim(),
            guid: guidMatch[1].trim(),
          });
        }
      }
    }

    return profiles;
  } catch (error) {
    console.error("Failed to read iTerm profiles:", error);
    return [];
  }
}
