/// <reference types="../raycast-env.d.ts" />

import { homedir } from "os";
import path from "path";
import { config } from "dotenv";
import { getPreferenceValues } from "@raycast/api";

config();

export const IGNORED_FOLDERS_PATTERN =
  /^\.|^(node_modules|venv|__pycache__|target|dist|build|vendor|bower_components)$/;

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

  return "/Users/rocsun/Code";
}
