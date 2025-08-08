import fs from "fs";
import { parsePresetOutput, PresetGroup } from "./presetParser";
import { execPromise } from "../util/exec";

/**
 * Get Presets from HandbakeCLI
 */
export async function getPresets(): Promise<PresetGroup[]> {
  try {
    const cli = await findHandBrakeCLIPath();
    const { stdout, stderr } = await execPromise(`${cli} --preset-list`);

    const output = stdout && stdout.trim().length > 0 ? stdout : stderr;
    return parsePresetOutput(output);
  } catch (error) {
    console.error("Error loading presets:", error);
  }
  return [];
}

/**
 * Search for HandbrakeCLI in common paths
 */
export async function findHandBrakeCLIPath(): Promise<string | null> {
  try {
    const commonPaths = [
      // Homebrew (Intel)
      "/usr/local/bin/HandBrakeCLI",
      // Homebrew (Apple Silicon)
      "/opt/homebrew/bin/HandBrakeCLI",
    ];

    // Check if any of the common paths exist and meet version requirements
    for (const path of commonPaths) {
      if (fs.existsSync(path)) {
        console.log(`Found System HandBreakCLI at: ${path}`);
        return path;
      }
    }

    return null;
  } catch (error) {
    console.error("Error finding valid HandBrakeCLI:", error);
    return null;
  }
}
