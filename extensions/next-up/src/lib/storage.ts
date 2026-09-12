import { LocalStorage } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import { AppData, ScheduleTemplate } from "./types";
import { STORAGE_KEY, TEMPLATES_KEY } from "./constants";

// Old keys for backward compatibility migration
const OLD_STORAGE_KEY = "nextup_data";
const OLD_TEMPLATES_KEY = "nextup_templates";

/**
 * Migrates data from old storage keys to new keys.
 * Only migrates if new keys don't already exist.
 */
async function migrateOldData(): Promise<void> {
  try {
    // Migrate app data
    const oldData = await LocalStorage.getItem<string>(OLD_STORAGE_KEY);
    const newData = await LocalStorage.getItem<string>(STORAGE_KEY);

    if (oldData && !newData) {
      await LocalStorage.setItem(STORAGE_KEY, oldData);
      await LocalStorage.removeItem(OLD_STORAGE_KEY);
    }

    // Migrate templates
    const oldTemplates = await LocalStorage.getItem<string>(OLD_TEMPLATES_KEY);
    const newTemplates = await LocalStorage.getItem<string>(TEMPLATES_KEY);

    if (oldTemplates && !newTemplates) {
      await LocalStorage.setItem(TEMPLATES_KEY, oldTemplates);
      await LocalStorage.removeItem(OLD_TEMPLATES_KEY);
    }
  } catch {
    // Migration failed silently - new users start fresh
  }
}

const DEFAULT_APP_DATA: AppData = {
  groups: [],
  activeGroupId: null,
};

export async function loadAppData(): Promise<AppData> {
  await migrateOldData();
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!stored) {
    return DEFAULT_APP_DATA;
  }
  try {
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === "object" && "groups" in parsed) {
      return parsed as AppData;
    }
  } catch {
    // Invalid JSON, return default
  }
  return DEFAULT_APP_DATA;
}

export async function saveAppData(data: AppData): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function loadTemplates(): Promise<ScheduleTemplate[]> {
  const stored = await LocalStorage.getItem<string>(TEMPLATES_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as ScheduleTemplate[];
  } catch {
    return [];
  }
}

export async function saveTemplates(templates: ScheduleTemplate[]): Promise<void> {
  await LocalStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

export async function exportToFile(data: AppData, exportDir: string): Promise<string> {
  // Resolve ~ to user's home directory
  const homeDir = process.env.HOME ?? "/tmp";
  const dir = exportDir.startsWith("~") ? exportDir.replace(/^~/, homeDir) : exportDir;

  // Ensure directory exists
  await fs.promises.mkdir(dir, { recursive: true });

  const filename = `next-up-export-${new Date().toISOString().split("T")[0]}.json`;
  const fullPath = path.join(dir, filename);
  await fs.promises.writeFile(fullPath, JSON.stringify(data, null, 2), "utf-8");
  return fullPath;
}

export async function importFromFile(filePath: string): Promise<AppData> {
  // Resolve ~ to user's home directory
  const homeDir = process.env.HOME ?? "/tmp";
  const resolvedPath = filePath.startsWith("~") ? filePath.replace(/^~/, homeDir) : filePath;

  // Check if file exists
  try {
    await fs.promises.access(resolvedPath, fs.constants.R_OK);
  } catch {
    throw new Error(`File not found or not readable: ${resolvedPath}`);
  }

  try {
    const content = await fs.promises.readFile(resolvedPath, "utf-8");

    if (!content.trim()) {
      throw new Error("File is empty");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (parseErr) {
      throw new Error(`Invalid JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid Next Up export file: not a valid object");
    }

    if (!Array.isArray((parsed as Record<string, unknown>).groups)) {
      throw new Error("Invalid Next Up export file: missing or invalid 'groups' array");
    }

    return parsed as AppData;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("File not found")) {
      throw err;
    }
    if (err instanceof Error && (err.message.startsWith("Invalid") || err.message.startsWith("File is"))) {
      throw err;
    }
    throw new Error(`Failed to read or parse file: ${err instanceof Error ? err.message : String(err)}`);
  }
}
