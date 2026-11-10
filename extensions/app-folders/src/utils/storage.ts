import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { AppItem, Folder } from "../types";
import { t } from "./i18n";
import { isCustomIconFile } from "./iconExtractor";

const STORAGE_KEY = "user_dynamic_app_folders_v3";
export const MAX_SHORTCUT_SLOTS = 5; // Maximum number of dedicated shortcut slots

/**
 * Returns a clean display title for a folder.
 * - Custom image file or plain folder ("📁" or empty): shows folder name only
 * - Emoji prefix: shows "🛠️ FolderName"
 */
export function formatFolderTitle(folder: Folder): string {
  if (!folder.icon || folder.icon === "📁" || isCustomIconFile(folder.icon)) {
    return folder.name;
  }
  return `${folder.icon} ${folder.name}`;
}

// Initial sample folders seeded on fresh install:
// 1. Utilities: Shows live 2x2 frosted glass preview of native macOS apps
// 2. Custom Icon Guide: Demonstrates custom image icons and remains empty for user customization
const INITIAL_SEED_FOLDERS: Folder[] = [
  {
    id: "folder_default_utilities",
    name: t.seedUtilities,
    icon: "🛠️",
    slot: 1, // Automatically assigned to shortcut slot 1
    createdAt: Date.now(),
    apps: [
      {
        id: "/System/Applications/Calculator.app",
        name: "Calculator",
        path: "/System/Applications/Calculator.app",
      },
      {
        id: "/System/Applications/Utilities/Activity Monitor.app",
        name: "Activity Monitor",
        path: "/System/Applications/Utilities/Activity Monitor.app",
      },
      {
        id: "/System/Applications/TextEdit.app",
        name: "TextEdit",
        path: "/System/Applications/TextEdit.app",
      },
      {
        id: "/System/Applications/Utilities/Terminal.app",
        name: "Terminal",
        path: "/System/Applications/Utilities/Terminal.app",
      },
    ],
  },
  {
    id: "folder_default_custom_icons",
    name: t.seedCustomIconFolder,
    icon: "microsoft.png",
    slot: 2, // Automatically assigned to shortcut slot 2
    createdAt: Date.now() + 1,
    apps: [],
  },
];

/**
 * Retrieves all stored folders from LocalStorage.
 */
export async function getFolders(): Promise<Folder[]> {
  try {
    const rawData = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!rawData) {
      await saveFolders(INITIAL_SEED_FOLDERS);
      return INITIAL_SEED_FOLDERS;
    }
    const parsed = JSON.parse(rawData);
    if (!Array.isArray(parsed)) {
      return INITIAL_SEED_FOLDERS;
    }

    // Migrate legacy default folder if present (update name and empty apps as requested)
    let migrated = false;
    const folders = (parsed as Folder[]).map((f) => {
      if (
        f.id === "folder_default_ms" ||
        f.id === "folder_default_custom_icons"
      ) {
        if (f.name.includes("Microsoft") || f.apps.length > 0) {
          migrated = true;
          return {
            ...f,
            name: t.seedCustomIconFolder,
            apps: [],
          };
        }
      }
      return f;
    });

    if (migrated) {
      await saveFolders(folders);
    }

    return folders;
  } catch {
    return INITIAL_SEED_FOLDERS;
  }
}

/**
 * Persists all folders to LocalStorage.
 */
export async function saveFolders(folders: Folder[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
}

/**
 * Finds the first available shortcut slot (1 to 5).
 */
export function findFirstAvailableSlot(folders: Folder[]): number | undefined {
  const occupiedSlots = new Set(folders.map((f) => f.slot).filter(Boolean));
  for (let s = 1; s <= MAX_SHORTCUT_SLOTS; s++) {
    if (!occupiedSlots.has(s)) {
      return s;
    }
  }
  return undefined;
}

/**
 * Creates a new folder and assigns a shortcut slot.
 */
export async function createFolder(
  name: string,
  icon: string = "",
  preferredSlot?: number | null,
  previewStyle: "auto" | "plain" = "auto",
): Promise<Folder> {
  const folders = await getFolders();

  let assignedSlot: number | undefined;
  if (preferredSlot === null) {
    assignedSlot = undefined;
  } else if (typeof preferredSlot === "number") {
    assignedSlot = preferredSlot;
  } else {
    assignedSlot = findFirstAvailableSlot(folders);
  }

  // Prevent slot duplication: unassign slot from existing folder if taken
  const cleanedFolders = folders.map((f) => {
    if (assignedSlot && f.slot === assignedSlot) {
      return { ...f, slot: undefined };
    }
    return f;
  });

  const newFolder: Folder = {
    id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    icon: icon.trim(),
    previewStyle,
    slot: assignedSlot,
    apps: [],
    createdAt: Date.now(),
  };

  await saveFolders([...cleanedFolders, newFolder]);
  return newFolder;
}

/**
 * Deletes a folder completely. The shortcut slot is released.
 */
export async function deleteFolder(folderId: string): Promise<void> {
  const folders = await getFolders();
  const filtered = folders.filter((f) => f.id !== folderId);
  await saveFolders(filtered);
}

/**
 * Updates folder name, icon, slot, or thumbnail style.
 */
export async function updateFolder(
  folderId: string,
  updates: {
    name?: string;
    icon?: string;
    slot?: number | null;
    previewStyle?: "auto" | "plain";
  },
): Promise<Folder | null> {
  const folders = await getFolders();
  let updatedTarget: Folder | null = null;

  const updated = folders.map((f) => {
    if (f.id === folderId) {
      updatedTarget = {
        ...f,
        name: updates.name !== undefined ? updates.name.trim() : f.name,
        icon: updates.icon !== undefined ? updates.icon.trim() : f.icon,
        slot: updates.slot === null ? undefined : (updates.slot ?? f.slot),
        previewStyle:
          updates.previewStyle !== undefined
            ? updates.previewStyle
            : (f.previewStyle ?? "auto"),
      };
      return updatedTarget;
    }
    // Prevent slot conflict
    if (updates.slot && f.slot === updates.slot && f.id !== folderId) {
      return { ...f, slot: undefined };
    }
    return f;
  });

  await saveFolders(updated);
  return updatedTarget;
}

/**
 * Finds a folder assigned to a specific slot (1 to 5).
 */
export async function getFolderBySlot(
  slot: number,
): Promise<Folder | undefined> {
  const folders = await getFolders();
  return folders.find((f) => f.slot === slot);
}

/**
 * Adds an app to a folder.
 */
export async function addAppToFolder(
  folderId: string,
  app: AppItem,
): Promise<boolean> {
  const folders = await getFolders();
  let added = false;

  const updated = folders.map((f) => {
    if (f.id === folderId) {
      const exists = f.apps.some((a) => a.path === app.path);
      if (!exists) {
        added = true;
        return { ...f, apps: [...f.apps, app] };
      }
    }
    return f;
  });

  if (added) {
    await saveFolders(updated);
  }
  return added;
}

/**
 * Removes an app from a folder.
 */
export async function removeAppFromFolder(
  folderId: string,
  appPath: string,
): Promise<void> {
  const folders = await getFolders();
  const updated = folders.map((f) => {
    if (f.id === folderId) {
      return {
        ...f,
        apps: f.apps.filter((a) => a.path !== appPath),
      };
    }
    return f;
  });
  await saveFolders(updated);
}

/**
 * Reorders an app left or right inside a folder.
 */
export async function moveAppInFolder(
  folderId: string,
  appPath: string,
  direction: "left" | "right",
): Promise<Folder | null> {
  const folders = await getFolders();
  let updatedFolder: Folder | null = null;

  const updatedFolders = folders.map((f) => {
    if (f.id === folderId) {
      const index = f.apps.findIndex((a) => a.path === appPath);
      if (index === -1) return f;

      const newIndex = direction === "left" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= f.apps.length) return f;

      const newApps = [...f.apps];
      const [movedApp] = newApps.splice(index, 1);
      newApps.splice(newIndex, 0, movedApp);

      updatedFolder = { ...f, apps: newApps };
      return updatedFolder;
    }
    return f;
  });

  if (updatedFolder) {
    await saveFolders(updatedFolders);
  }
  return updatedFolder;
}

/**
 * Reorders a folder left or right in the main dashboard.
 */
export async function moveFolder(
  folderId: string,
  direction: "left" | "right",
): Promise<Folder[]> {
  const folders = await getFolders();
  const index = folders.findIndex((f) => f.id === folderId);
  if (index === -1) return folders;

  const newIndex = direction === "left" ? index - 1 : index + 1;
  if (newIndex < 0 || newIndex >= folders.length) return folders;

  const updatedFolders = [...folders];
  const [movedFolder] = updatedFolders.splice(index, 1);
  updatedFolders.splice(newIndex, 0, movedFolder);

  await saveFolders(updatedFolders);
  return updatedFolders;
}

/**
 * Moves an app from one folder to another.
 */
export async function moveAppToAnotherFolder(
  fromFolderId: string,
  toFolderId: string,
  appPath: string,
): Promise<{ success: boolean; movedApp?: AppItem }> {
  const folders = await getFolders();
  const sourceFolder = folders.find((f) => f.id === fromFolderId);
  const targetFolder = folders.find((f) => f.id === toFolderId);
  if (!sourceFolder || !targetFolder) return { success: false };

  const app = sourceFolder.apps.find((a) => a.path === appPath);
  if (!app) return { success: false };

  const alreadyInTarget = targetFolder.apps.some((a) => a.path === appPath);

  const updatedFolders = folders.map((f) => {
    if (f.id === fromFolderId) {
      return {
        ...f,
        apps: f.apps.filter((a) => a.path !== appPath),
      };
    }
    if (f.id === toFolderId) {
      return {
        ...f,
        apps: alreadyInTarget ? f.apps : [...f.apps, app],
      };
    }
    return f;
  });

  await saveFolders(updatedFolders);
  return { success: true, movedApp: app };
}

/**
 * Exports all folders to a formatted JSON string.
 */
export async function exportFoldersJSON(): Promise<string> {
  const folders = await getFolders();
  return JSON.stringify(folders, null, 2);
}

/**
 * Imports and restores folders from a JSON backup.
 * mode: "merge" (keep existing + add new) or "replace" (overwrite all)
 */
export async function importFoldersJSON(
  jsonString: string,
  mode: "merge" | "replace" = "merge",
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const parsed = JSON.parse(jsonString.trim());
    if (!Array.isArray(parsed)) {
      return {
        success: false,
        count: 0,
        error: "Invalid format: Expected array of folders",
      };
    }

    const validated: Folder[] = [];
    for (const item of parsed) {
      if (!item || typeof item.name !== "string" || !item.name.trim()) continue;
      validated.push({
        id:
          typeof item.id === "string" && item.id.trim()
            ? item.id
            : `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: item.name.trim(),
        icon: typeof item.icon === "string" ? item.icon : "",
        previewStyle: item.previewStyle === "plain" ? "plain" : "auto",
        slot:
          typeof item.slot === "number" &&
          item.slot >= 1 &&
          item.slot <= MAX_SHORTCUT_SLOTS
            ? item.slot
            : undefined,
        apps: Array.isArray(item.apps)
          ? (item.apps as AppItem[]).filter(
              (a) =>
                a && typeof a.path === "string" && typeof a.name === "string",
            )
          : [],
        createdAt:
          typeof item.createdAt === "number" ? item.createdAt : Date.now(),
      });
    }

    if (validated.length === 0) {
      return {
        success: false,
        count: 0,
        error: "No valid folders found in backup",
      };
    }

    if (mode === "replace") {
      await saveFolders(validated);
      return { success: true, count: validated.length };
    }

    // Merge mode
    const current = await getFolders();
    const currentMap = new Map(current.map((f) => [f.name.toLowerCase(), f]));

    for (const val of validated) {
      const existing = currentMap.get(val.name.toLowerCase());
      if (existing) {
        const existingPaths = new Set(existing.apps.map((a) => a.path));
        const newApps = val.apps.filter((a) => !existingPaths.has(a.path));
        existing.apps.push(...newApps);
      } else {
        current.push(val);
      }
    }

    await saveFolders(current);
    return { success: true, count: validated.length };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "JSON parsing error";
    return {
      success: false,
      count: 0,
      error: errorMsg,
    };
  }
}

const SETTINGS_SHOW_SHORTCUT_HINTS = "settings_show_shortcut_hints";

/**
 * Retrieves whether ⌘1–⌘9 shortcut badges should be displayed.
 * LocalStorage setting takes precedence, falling back to package.json preference (default true).
 */
export async function getShowShortcutHints(): Promise<boolean> {
  try {
    const stored = await LocalStorage.getItem<boolean>(
      SETTINGS_SHOW_SHORTCUT_HINTS,
    );
    if (stored !== undefined) return stored;

    const prefs = getPreferenceValues<{ showShortcutHints?: boolean }>();
    if (prefs.showShortcutHints !== undefined) return prefs.showShortcutHints;
  } catch {
    // Ignore and fallback to true
  }
  return true;
}

/**
 * Persists the ⌘1–⌘9 shortcut badge display state to LocalStorage.
 */
export async function setShowShortcutHints(show: boolean): Promise<void> {
  await LocalStorage.setItem(SETTINGS_SHOW_SHORTCUT_HINTS, show);
}

/**
 * Resets all stored folders back to the initial default seed folders.
 */
export async function resetToDefaultFolders(): Promise<Folder[]> {
  await saveFolders(INITIAL_SEED_FOLDERS);
  return INITIAL_SEED_FOLDERS;
}
