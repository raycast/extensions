import { getPreferenceValues } from "@raycast/api";
import { accessSync, constants } from "fs";
import { homedir, userInfo } from "os";
import { delimiter, join } from "path";

const YABAI_BINARY_NAME = "yabai";
const USER = process.env.USER || userInfo().username;
const HOME_DIRECTORY = process.env.HOME || homedir();
const DEFAULT_PATH_DIRECTORIES = [
  join(HOME_DIRECTORY, ".nix-profile/bin"),
  `/etc/profiles/per-user/${USER}/bin`,
  "/run/current-system/sw/bin",
  "/nix/var/nix/profiles/default/bin",
  "/opt/homebrew/bin",
  "/opt/local/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
];

const PATH_DIRECTORIES = uniqueDirectories([
  ...(process.env.PATH?.split(delimiter) ?? []),
  ...DEFAULT_PATH_DIRECTORIES,
]);

let cachedPreferencePath: string | undefined;
let cachedYabaiPath: string | undefined;

export const YABAI_EXEC_ENV = {
  ...process.env,
  PATH: PATH_DIRECTORIES.join(delimiter),
  USER,
};

export type YabaiPathLookup = {
  path?: string;
  configuredPath?: string;
  searchedPaths: string[];
};

export function resolveYabaiPath(): YabaiPathLookup {
  const configuredPath = getConfiguredYabaiPath();
  const searchedPaths: string[] = [];

  if (cachedYabaiPath && cachedPreferencePath === configuredPath && isExecutablePath(cachedYabaiPath)) {
    return { path: cachedYabaiPath, configuredPath, searchedPaths };
  }

  const configuredYabaiPath = configuredPath ? resolveExecutableCandidate(configuredPath, searchedPaths) : undefined;
  if (configuredYabaiPath) {
    return cacheLookup(configuredPath, configuredYabaiPath, searchedPaths);
  }

  if (configuredPath) {
    return {
      configuredPath,
      searchedPaths,
    };
  }

  const pathYabaiPath = resolveExecutableCandidate(YABAI_BINARY_NAME, searchedPaths);
  if (pathYabaiPath) {
    return cacheLookup(configuredPath, pathYabaiPath, searchedPaths);
  }

  return {
    configuredPath,
    searchedPaths,
  };
}

export function formatYabaiPathLookupError(lookup: YabaiPathLookup): string {
  if (lookup.configuredPath) {
    return `Configured yabai path is not executable: ${lookup.configuredPath}`;
  }

  return `Searched PATH and common install locations: ${lookup.searchedPaths.join(", ")}`;
}

function cacheLookup(configuredPath: string | undefined, yabaiPath: string, searchedPaths: string[]): YabaiPathLookup {
  cachedPreferencePath = configuredPath;
  cachedYabaiPath = yabaiPath;

  return { path: yabaiPath, configuredPath, searchedPaths };
}

function getConfiguredYabaiPath(): string | undefined {
  const preferences = getPreferenceValues<Preferences>();
  const configuredPath = preferences.yabaiPath?.trim();

  return configuredPath ? expandHomeDirectory(configuredPath) : undefined;
}

function resolveExecutableCandidate(candidate: string, searchedPaths: string[]): string | undefined {
  const expandedCandidate = expandHomeDirectory(candidate);

  if (expandedCandidate.includes("/")) {
    searchedPaths.push(expandedCandidate);
    return isExecutablePath(expandedCandidate) ? expandedCandidate : undefined;
  }

  for (const directory of PATH_DIRECTORIES) {
    const executablePath = join(directory, expandedCandidate);
    searchedPaths.push(executablePath);

    if (isExecutablePath(executablePath)) {
      return executablePath;
    }
  }

  return undefined;
}

function isExecutablePath(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function expandHomeDirectory(path: string): string {
  return path === "~" || path.startsWith("~/") ? join(HOME_DIRECTORY, path.slice(2)) : path;
}

function uniqueDirectories(directories: string[]): string[] {
  const seenDirectories = new Set<string>();
  const uniqueDirectoryList: string[] = [];

  for (const directory of directories) {
    if (!directory || seenDirectories.has(directory)) {
      continue;
    }

    seenDirectories.add(directory);
    uniqueDirectoryList.push(directory);
  }

  return uniqueDirectoryList;
}
