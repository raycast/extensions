import { environment } from "@raycast/api";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  unlinkSync,
} from "fs";
import { join, dirname, extname } from "path";
import { createHash } from "crypto";

export interface ProjectIDE {
  path: string;
  name: string;
}

export interface ProjectSettings {
  displayName?: string;
  icon?: string;
  customIcon?: string;
  iconColor?: string;
  ide?: ProjectIDE;
  collections?: string[];
  lastOpened?: number;
}

interface SettingsStore {
  [projectPath: string]: ProjectSettings;
}

const SETTINGS_FILE = join(environment.supportPath, "project-settings.json");
const CUSTOM_ICONS_DIR = join(environment.supportPath, "custom-icons");

function ensureSettingsDir(): void {
  const dir = dirname(SETTINGS_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function ensureCustomIconsDir(): void {
  if (!existsSync(CUSTOM_ICONS_DIR)) {
    mkdirSync(CUSTOM_ICONS_DIR, { recursive: true });
  }
}

export function copyCustomIcon(
  projectPath: string,
  sourceFilePath: string,
): string {
  ensureCustomIconsDir();
  const hash = createHash("md5").update(projectPath).digest("hex").slice(0, 12);
  const ext = extname(sourceFilePath).toLowerCase();
  const destFilename = `${hash}${ext}`;
  const destPath = join(CUSTOM_ICONS_DIR, destFilename);
  copyFileSync(sourceFilePath, destPath);
  return destPath;
}

export function deleteCustomIcon(iconPath: string): void {
  if (
    iconPath &&
    existsSync(iconPath) &&
    iconPath.startsWith(CUSTOM_ICONS_DIR)
  ) {
    try {
      unlinkSync(iconPath);
    } catch {
      // Ignore deletion errors
    }
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
  const hasContent =
    settings.displayName ||
    settings.icon ||
    settings.customIcon ||
    settings.iconColor ||
    settings.ide ||
    (settings.collections && settings.collections.length > 0) ||
    settings.lastOpened;

  if (!hasContent) {
    delete store[projectPath];
  } else {
    store[projectPath] = settings;
  }

  writeFileSync(SETTINGS_FILE, JSON.stringify(store, null, 2));
}

export function deleteProjectSettings(projectPath: string): void {
  ensureSettingsDir();
  const store = loadAllSettings();
  delete store[projectPath];
  writeFileSync(SETTINGS_FILE, JSON.stringify(store, null, 2));
}

export function clearProjectIde(projectPath: string): void {
  ensureSettingsDir();
  const store = loadAllSettings();
  const settings = store[projectPath];
  if (settings) {
    delete settings.ide;
    store[projectPath] = settings;
    writeFileSync(SETTINGS_FILE, JSON.stringify(store, null, 2));
  }
}

export function migrateProjectSettings(oldPath: string, newPath: string): void {
  ensureSettingsDir();
  const store = loadAllSettings();
  const settings = store[oldPath];
  if (settings) {
    store[newPath] = settings;
    delete store[oldPath];
    writeFileSync(SETTINGS_FILE, JSON.stringify(store, null, 2));
  }
}

export function removeCollectionFromAllProjects(collectionId: string): number {
  const store = loadAllSettings();
  let cleanedCount = 0;

  for (const [, settings] of Object.entries(store)) {
    if (settings.collections?.includes(collectionId)) {
      settings.collections = settings.collections.filter(
        (id) => id !== collectionId,
      );
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    ensureSettingsDir();
    writeFileSync(SETTINGS_FILE, JSON.stringify(store, null, 2));
  }

  return cleanedCount;
}
