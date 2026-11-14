import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { AppItem, Folder } from "../types";
import { t } from "./i18n";
import { isCustomIconFile } from "./iconExtractor";

const STORAGE_KEY = "user_dynamic_app_folders_v3";
export const MAX_SHORTCUT_SLOTS = 5; // Maximum number of dedicated shortcut slots

// Serialized mutex queue so concurrent read-modify-write operations never overwrite each other
let storageQueue: Promise<void> = Promise.resolve();

function withStorageLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(operation, operation);
  storageQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function generateFolderId(): string {
  return `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

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
 * Internal unlocked reader. Seeds only when the storage key is completely absent.
 * Throws if stored data is unreadable or corrupted so callers never overwrite user data with sample folders.
 */
async function readFoldersUnlocked(): Promise<Folder[]> {
  const rawData = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (rawData === undefined) {
    await saveFoldersUnlocked(INITIAL_SEED_FOLDERS);
    return INITIAL_SEED_FOLDERS.map((f) => ({ ...f, apps: [...f.apps] }));
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawData);
  } catch {
    throw new Error(t.loadFoldersError);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(t.loadFoldersError);
  }

  return parsed as Folder[];
}

async function saveFoldersUnlocked(folders: Folder[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
}

/**
 * Retrieves all stored folders from LocalStorage.
 */
export async function getFolders(): Promise<Folder[]> {
  return withStorageLock(() => readFoldersUnlocked());
}

/**
 * Persists all folders to LocalStorage.
 */
export async function saveFolders(folders: Folder[]): Promise<void> {
  return withStorageLock(() => saveFoldersUnlocked(folders));
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
 * Creates a new folder and assigns a shortcut slot atomically.
 */
export async function createFolder(
  name: string,
  icon: string = "",
  preferredSlot?: number | null,
  previewStyle: "auto" | "plain" = "auto",
): Promise<Folder> {
  return withStorageLock(async () => {
    const folders = await readFoldersUnlocked();

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
      id: generateFolderId(),
      name: name.trim(),
      icon: icon.trim(),
      previewStyle,
      slot: assignedSlot,
      apps: [],
      createdAt: Date.now(),
    };

    await saveFoldersUnlocked([...cleanedFolders, newFolder]);
    return newFolder;
  });
}

/**
 * Deletes a folder completely. The shortcut slot is released.
 */
export async function deleteFolder(folderId: string): Promise<void> {
  return withStorageLock(async () => {
    const folders = await readFoldersUnlocked();
    const filtered = folders.filter((f) => f.id !== folderId);
    await saveFoldersUnlocked(filtered);
  });
}

/**
 * Updates folder name, icon, slot, or thumbnail style atomically.
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
  return withStorageLock(async () => {
    const folders = await readFoldersUnlocked();
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

    await saveFoldersUnlocked(updated);
    return updatedTarget;
  });
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
 * Adds an app to a folder atomically.
 */
export async function addAppToFolder(
  folderId: string,
  app: AppItem,
): Promise<boolean> {
  return withStorageLock(async () => {
    const folders = await readFoldersUnlocked();
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
      await saveFoldersUnlocked(updated);
    }
    return added;
  });
}

/**
 * Removes an app from a folder atomically.
 */
export async function removeAppFromFolder(
  folderId: string,
  appPath: string,
): Promise<void> {
  return withStorageLock(async () => {
    const folders = await readFoldersUnlocked();
    const updated = folders.map((f) => {
      if (f.id === folderId) {
        return {
          ...f,
          apps: f.apps.filter((a) => a.path !== appPath),
        };
      }
      return f;
    });
    await saveFoldersUnlocked(updated);
  });
}

/**
 * Reorders an app left or right inside a folder atomically.
 */
export async function moveAppInFolder(
  folderId: string,
  appPath: string,
  direction: "left" | "right",
): Promise<Folder | null> {
  return withStorageLock(async () => {
    const folders = await readFoldersUnlocked();
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
      await saveFoldersUnlocked(updatedFolders);
    }
    return updatedFolder;
  });
}

/**
 * Reorders a folder left or right in the main dashboard atomically.
 */
export async function moveFolder(
  folderId: string,
  direction: "left" | "right",
): Promise<Folder[]> {
  return withStorageLock(async () => {
    const folders = await readFoldersUnlocked();
    const index = folders.findIndex((f) => f.id === folderId);
    if (index === -1) return folders;

    const newIndex = direction === "left" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= folders.length) return folders;

    const updatedFolders = [...folders];
    const [movedFolder] = updatedFolders.splice(index, 1);
    updatedFolders.splice(newIndex, 0, movedFolder);

    await saveFoldersUnlocked(updatedFolders);
    return updatedFolders;
  });
}

/**
 * Moves an app from one folder to another atomically.
 */
export async function moveAppToAnotherFolder(
  fromFolderId: string,
  toFolderId: string,
  appPath: string,
): Promise<{ success: boolean; movedApp?: AppItem }> {
  return withStorageLock(async () => {
    const folders = await readFoldersUnlocked();
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

    await saveFoldersUnlocked(updatedFolders);
    return { success: true, movedApp: app };
  });
}

/**
 * Exports all folders to a formatted JSON string.
 */
export async function exportFoldersJSON(): Promise<string> {
  const folders = await getFolders();
  return JSON.stringify(folders, null, 2);
}

/**
 * Imports and restores folders from a JSON backup atomically.
 * Reconciles duplicate IDs and slot assignments within the backup and against existing folders.
 */
export async function importFoldersJSON(
  jsonString: string,
  mode: "merge" | "replace" = "merge",
): Promise<number> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString.trim());
  } catch {
    throw new Error(t.importErrorInvalidJson);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid format: Expected an array of folders.");
  }

  const seenBackupIds = new Set<string>();
  const seenBackupSlots = new Set<number>();
  const validated: Folder[] = [];

  for (const item of parsed) {
    if (!item || typeof item.name !== "string" || !item.name.trim()) continue;

    let rawId =
      typeof item.id === "string" && item.id.trim()
        ? item.id.trim()
        : generateFolderId();
    if (seenBackupIds.has(rawId)) {
      rawId = generateFolderId();
    }
    seenBackupIds.add(rawId);

    let rawSlot: number | undefined =
      typeof item.slot === "number" &&
      item.slot >= 1 &&
      item.slot <= MAX_SHORTCUT_SLOTS
        ? item.slot
        : undefined;
    if (rawSlot !== undefined) {
      if (seenBackupSlots.has(rawSlot)) {
        rawSlot = undefined;
      } else {
        seenBackupSlots.add(rawSlot);
      }
    }

    const validApps: AppItem[] = [];
    const seenAppPaths = new Set<string>();
    if (Array.isArray(item.apps)) {
      for (const a of item.apps as AppItem[]) {
        if (
          a &&
          typeof a.path === "string" &&
          a.path.trim() &&
          typeof a.name === "string" &&
          a.name.trim() &&
          !seenAppPaths.has(a.path)
        ) {
          seenAppPaths.add(a.path);
          validApps.push({
            id: typeof a.id === "string" && a.id.trim() ? a.id : a.path,
            name: a.name.trim(),
            path: a.path,
            keywords: Array.isArray(a.keywords) ? a.keywords : undefined,
          });
        }
      }
    }

    validated.push({
      id: rawId,
      name: item.name.trim(),
      icon: typeof item.icon === "string" ? item.icon : "",
      previewStyle: item.previewStyle === "plain" ? "plain" : "auto",
      slot: rawSlot,
      apps: validApps,
      createdAt:
        typeof item.createdAt === "number" ? item.createdAt : Date.now(),
    });
  }

  if (validated.length === 0) {
    throw new Error("No valid folders found in backup.");
  }

  return withStorageLock(async () => {
    if (mode === "replace") {
      await saveFoldersUnlocked(validated);
      return validated.length;
    }

    // Merge mode: read existing folders and reconcile IDs and slots
    const current = await readFoldersUnlocked();
    const currentByName = new Map(
      current.map((f) => [f.name.toLowerCase(), f]),
    );
    const usedIds = new Set(current.map((f) => f.id));
    const usedSlots = new Set(
      current
        .map((f) => f.slot)
        .filter((s): s is number => typeof s === "number"),
    );

    for (const val of validated) {
      const existing = currentByName.get(val.name.toLowerCase());
      if (existing) {
        const existingPaths = new Set(existing.apps.map((a) => a.path));
        const newApps = val.apps.filter((a) => !existingPaths.has(a.path));
        existing.apps.push(...newApps);
        if (
          existing.slot === undefined &&
          val.slot !== undefined &&
          !usedSlots.has(val.slot)
        ) {
          existing.slot = val.slot;
          usedSlots.add(val.slot);
        }
      } else {
        // Assign a fresh ID if the imported ID collides with an existing (e.g. renamed) folder
        let reconciledId = val.id;
        while (usedIds.has(reconciledId)) {
          reconciledId = generateFolderId();
        }
        usedIds.add(reconciledId);

        // Unassign slot if already occupied by an existing folder
        let reconciledSlot = val.slot;
        if (reconciledSlot !== undefined) {
          if (usedSlots.has(reconciledSlot)) {
            reconciledSlot = undefined;
          } else {
            usedSlots.add(reconciledSlot);
          }
        }

        const newFolder: Folder = {
          ...val,
          id: reconciledId,
          slot: reconciledSlot,
        };
        current.push(newFolder);
        currentByName.set(newFolder.name.toLowerCase(), newFolder);
      }
    }

    await saveFoldersUnlocked(current);
    return validated.length;
  });
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

    const prefs = getPreferenceValues<Preferences>();
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
 * Resets all stored folders back to the initial default seed folders atomically.
 */
export async function resetToDefaultFolders(): Promise<Folder[]> {
  return withStorageLock(async () => {
    const freshSeed = INITIAL_SEED_FOLDERS.map((f) => ({
      ...f,
      apps: [...f.apps],
    }));
    await saveFoldersUnlocked(freshSeed);
    return freshSeed;
  });
}
