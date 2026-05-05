/**
 * Homebrew path utilities.
 *
 * Provides functions for resolving brew installation paths.
 */

import { execSync } from "child_process";
import { join as path_join } from "path";
import { cpus } from "os";
import { preferences } from "../preferences";

/**
 * The Homebrew prefix directory.
 * Determined by:
 * 1. Custom brew path preference (if set)
 * 2. Running `brew --prefix` command
 * 3. Fallback based on CPU architecture
 */
export const brewPrefix = (() => {
  if (preferences.customBrewPath && preferences.customBrewPath.length > 0)
    return path_join(preferences.customBrewPath, "..", "..");
  try {
    return execSync("brew --prefix", { encoding: "utf8" }).trim();
  } catch {
    const firstCpu = cpus()[0];
    return firstCpu?.model?.includes("Apple") ? "/opt/homebrew" : "/usr/local";
  }
})();

/**
 * Get a path relative to the brew prefix.
 */
export const brewPath = (suffix: string): string => path_join(brewPrefix, suffix);

/**
 * Get the path to the brew executable.
 */
export const brewExecutable = (): string => brewPath("bin/brew");
