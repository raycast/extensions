import { environment } from "@raycast/api";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

export interface ProjectIDE {
  path: string;
  name: string;
}

export interface ProjectSettings {
  displayName?: string;
  icon?: string;
  ide?: ProjectIDE;
}

interface SettingsStore {
  [projectPath: string]: ProjectSettings;
}

const SETTINGS_FILE = join(environment.supportPath, "project-settings.json");

function ensureSettingsDir(): void {
  const dir = dirname(SETTINGS_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function loadAllSettings(): SettingsStore {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const data = readFileSync(SETTINGS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    // Return empty store on error
  }
  return {};
}

export function getProjectSettings(projectPath: string): ProjectSettings {
  const store = loadAllSettings();
  return store[projectPath] || {};
}

export function saveProjectSettings(
  projectPath: string,
  settings: ProjectSettings,
): void {
  ensureSettingsDir();
  const store = loadAllSettings();

  // Remove empty settings
  if (!settings.displayName && !settings.icon && !settings.ide) {
    delete store[projectPath];
  } else {
    store[projectPath] = settings;
  }

  writeFileSync(SETTINGS_FILE, JSON.stringify(store, null, 2));
}
