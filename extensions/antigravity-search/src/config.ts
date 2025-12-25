/// <reference types="../raycast-env.d.ts" />

import { homedir } from "os";
import path from "path";
import { config } from "dotenv";
import { getPreferenceValues } from "@raycast/api";

config();

const DEFAULT_IGNORED_FOLDERS_PATTERN =
  /^\.|^(node_modules|venv|__pycache__|target|dist|build|vendor|bower_components)$/;

export function getIgnoredFoldersPattern(): RegExp {
  try {
    const preferences = getPreferenceValues<Preferences>();
    if (preferences.ignoredFoldersPattern) {
      return new RegExp(preferences.ignoredFoldersPattern);
    }
  } catch (error) {
    console.warn("Error reading ignoredFoldersPattern preference:", error);
  }

  if (process.env.ANTIGRAVITY_IGNORED_FOLDERS_PATTERN) {
    try {
      return new RegExp(process.env.ANTIGRAVITY_IGNORED_FOLDERS_PATTERN);
    } catch (error) {
      console.warn(
        "Invalid regex in ANTIGRAVITY_IGNORED_FOLDERS_PATTERN:",
        error,
      );
    }
  }

  return DEFAULT_IGNORED_FOLDERS_PATTERN;
}

export function getAgyCommandPath(): string {
  try {
    const preferences = getPreferenceValues<Preferences>();
    if (preferences.agyCommandPath) {
      return preferences.agyCommandPath;
    }
  } catch {
    // Ignore errors when reading preferences
  }

  if (process.env.ANTIGRAVITY_AGY_PATH) {
    return process.env.ANTIGRAVITY_AGY_PATH;
  }

  return path.join(homedir(), ".antigravity", "antigravity", "bin", "agy");
}

export function getDefaultSearchFolder(): string {
  try {
    const preferences = getPreferenceValues<Preferences>();
    if (preferences.projectsDirectory) {
      return preferences.projectsDirectory;
    }
  } catch {
    // Ignore errors when reading preferences
  }

  if (process.env.ANTIGRAVITY_PROJECTS_DIR) {
    return process.env.ANTIGRAVITY_PROJECTS_DIR;
  }

  return path.join(homedir(), "Code");
}
