import { environment } from "@raycast/api";
import { execSync } from "child_process";
import path from "path";

export interface SoundSource {
  name: string;
  processPath: string;
  isMuted: boolean;
  pid: number;
  isActive: boolean;
}

/**
 * Parses a CSV line handling quoted fields that may contain commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export default async function getActiveSoundSources(): Promise<SoundSource[]> {
  try {
    const svclPath = path.join(environment.assetsPath, "sound_volume_view.exe");

    // Run sound_volume_view.exe to get all sound sources in CSV format
    const output = execSync(`"${svclPath}" /scomma ""`, {
      encoding: "utf-8",
      windowsHide: true,
    });

    const lines = output.trim().split("\n");

    // Skip header line
    if (lines.length <= 1) {
      return [];
    }

    const soundSources: SoundSource[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = parseCSVLine(line);

      // Column indices (0-based):
      // 0: Name
      // 1: Type
      // 7: Device State
      // 8: Muted
      // 19: Process Path
      // 20: Process ID

      const type = columns[1];
      const processPath = columns[19]?.trim() || "";

      // Filter: only Applications with non-empty process paths
      if (type === "Application" && processPath) {
        const name = columns[0] || "";
        const deviceState = columns[7] || "";
        const isMuted = columns[8] === "Yes";
        const pid = parseInt(columns[20] || "0", 10);

        soundSources.push({
          name,
          processPath,
          isMuted,
          pid,
          isActive: deviceState === "Active",
        });
      }
    }

    // Sort: active sources first, then inactive
    soundSources.sort((a, b) => {
      if (a.isActive === b.isActive) return 0;
      return a.isActive ? -1 : 1;
    });

    return soundSources;
  } catch (error) {
    console.error("Failed to get active sound sources:", error);
    throw new Error(`Failed to enumerate sound sources: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
