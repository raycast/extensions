import { execFile } from "child_process";
import { promisify } from "util";
import { getBrewPath } from "./brew-path";
import type { AppUpdate } from "./types";

const execFileAsync = promisify(execFile);

type CaskOutdated = {
  name: string;
  installed_versions: string[];
  current_version: string;
};

export async function scanCaskUpdates(): Promise<AppUpdate[]> {
  const brewPath = await getBrewPath();
  if (!brewPath) return [];

  try {
    const { stdout } = await execFileAsync(brewPath, ["outdated", "--cask", "--json"], {
      timeout: 30000,
    });

    if (!stdout.trim()) return [];

    const outdated: { casks: CaskOutdated[] } = JSON.parse(stdout);
    if (!outdated.casks?.length) return [];

    return outdated.casks.map((cask) => ({
      name: cask.name,
      currentVersion: cask.installed_versions[0] ?? "unknown",
      latestVersion: cask.current_version,
      source: "cask" as const,
    }));
  } catch {
    return [];
  }
}
