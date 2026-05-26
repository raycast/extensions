import { existsSync, lstatSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";

import type { ExtensionPreferences, StorageResolution } from "../types";

const PROJECTS_FILE = "projects.json";
const PROJECT_MANAGER_STORAGE = "alefragnani.project-manager";

function getVSCodeAppName(preferences: ExtensionPreferences): string {
  return preferences.vscodeApp?.name || "Visual Studio Code";
}

function getDefaultStoragePath(preferences: ExtensionPreferences): string {
  const shortName = getVSCodeAppName(preferences).replace(
    /^Visual Studio /,
    "",
  );
  return join(
    homedir(),
    "Library",
    "Application Support",
    shortName,
    "User",
    "globalStorage",
    PROJECT_MANAGER_STORAGE,
  );
}

export function resolveProjectManagerStorage(
  preferences: ExtensionPreferences,
): StorageResolution {
  const overridePath = preferences.projectManagerDataPath?.trim();

  if (!overridePath) {
    const storagePath = getDefaultStoragePath(preferences);
    return {
      storagePath,
      projectsJsonPath: join(storagePath, PROJECTS_FILE),
      isDefault: true,
    };
  }

  if (!existsSync(overridePath)) {
    return {
      storagePath: overridePath,
      projectsJsonPath: join(overridePath, PROJECTS_FILE),
      isDefault: false,
      error: `Project Manager data path does not exist: ${overridePath}`,
    };
  }

  const stat = lstatSync(overridePath);
  if (stat.isDirectory()) {
    return {
      storagePath: overridePath,
      projectsJsonPath: join(overridePath, PROJECTS_FILE),
      isDefault: false,
    };
  }

  if (stat.isFile()) {
    return {
      storagePath: dirname(overridePath),
      projectsJsonPath: overridePath,
      isDefault: false,
    };
  }

  return {
    storagePath: overridePath,
    projectsJsonPath: join(overridePath, PROJECTS_FILE),
    isDefault: false,
    error: `Project Manager data path is not a directory or file: ${overridePath}`,
  };
}
