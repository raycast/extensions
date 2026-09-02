/**
 * Homebrew path utilities.
 *
 * Provides functions for resolving brew installation paths.
 */

import { execSync } from "child_process";
import { join as path_join } from "path";
import { cpus, homedir } from "os";
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
 * The Homebrew cache directory.
 *
 * Separate from the prefix: since Homebrew 4 the formula index is fetched from
 * the JSON API into here, so this — not anything under the prefix — is what
 * moves when `brew update` learns about new versions.
 */
export const brewCachePrefix = (() => {
  try {
    // Ask THIS brew, not whichever one is on PATH: with customBrewPath set they
    // can be different installations, and watching the wrong one's cache means
    // the freshness check never notices an update to the configured brew.
    return execSync(`"${path_join(brewPrefix, "bin", "brew")}" --cache`, { encoding: "utf8" }).trim();
  } catch {
    return path_join(homedir(), "Library", "Caches", "Homebrew");
  }
})();

/**
 * Get the path to the brew executable.
 */
export const brewExecutable = (): string => brewPath("bin/brew");
