import { execFile } from "child_process";
import { promisify } from "util";
import type { AppUpdate } from "./types";

const execFileAsync = promisify(execFile);

async function getMasPath(): Promise<string | null> {
  const paths = ["/opt/homebrew/bin/mas", "/usr/local/bin/mas"];
  for (const p of paths) {
    try {
      const { stdout } = await execFileAsync(p, ["version"]);
      if (stdout.trim()) return p;
    } catch {
      continue;
    }
  }
  return null;
}

export async function scanMasUpdates(): Promise<AppUpdate[]> {
  const masPath = await getMasPath();
  if (!masPath) return [];

  try {
    // `mas outdated` output format: "408981434 iMovie (10.4.1 -> 10.4.2)"
    const { stdout } = await execFileAsync(masPath, ["outdated"], {
      timeout: 30000,
    });

    if (!stdout.trim()) return [];

    const updates: AppUpdate[] = [];
    const lines = stdout.trim().split("\n");

    for (const line of lines) {
      const match = line.match(/^(\d+)\s+(.+?)\s+\((.+?)\s*->\s*(.+?)\)$/);
      if (!match) continue;

      const [, , name, currentVersion, latestVersion] = match;
      updates.push({
        name,
        currentVersion,
        latestVersion,
        source: "mas",
      });
    }

    return updates;
  } catch {
    return [];
  }
}
