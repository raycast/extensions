import { accessSync, constants, statSync } from "fs";
import { join } from "path";
import { getPreferenceValues } from "@raycast/api";
import { CLI_BINARY_NAME, CLI_SEARCH_PATHS } from "./preferences";

export function getConfiguredCliPath(): string | null {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.cliPath?.trim() || null;
}

function isExecutableFile(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    // Directories also pass the X_OK check; only accept regular files.
    return statSync(path).isFile();
  } catch {
    // Missing or not executable.
    return false;
  }
}

// A saved CLI Path replaces the search paths, even when it is invalid, so setup reports the bad
// setting (`invalid-cli-path`) instead of quietly using a different CLI.
export function findCliPath(): string | null {
  const customPath = getConfiguredCliPath();
  const candidates = customPath ? [customPath] : CLI_SEARCH_PATHS;

  for (const candidate of candidates) {
    if (isExecutableFile(candidate)) return candidate;
  }
  return null;
}

/** The CLI inside a Homebrew keg. Discovery deliberately does not search this path. */
export function brewPrefixCliPath(prefix: string): string {
  return join(prefix, "bin", CLI_BINARY_NAME);
}

export function findBrewPrefixCli(prefix: string): string | null {
  const path = brewPrefixCliPath(prefix);
  return isExecutableFile(path) ? path : null;
}

export function isCliInstalled(): boolean {
  return findCliPath() !== null;
}
