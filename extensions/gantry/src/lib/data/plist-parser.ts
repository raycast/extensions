import { exec } from "../utils/exec";
import type { PlistConfig } from "../types";

/**
 * Parses a .plist file by converting it to JSON via plutil and returning typed config.
 */
export async function parsePlist(plistPath: string): Promise<PlistConfig> {
  try {
    const result = await exec("plutil", [
      "-convert",
      "json",
      "-o",
      "-",
      plistPath,
    ]);
    const parsed = JSON.parse(result) as PlistConfig;
    return parsed;
  } catch (error) {
    const fallbackLabel =
      plistPath
        .split("/")
        .pop()
        ?.replace(/\.plist$/, "") ?? "unknown";

    return {
      Label: fallbackLabel,
    };
  }
}
