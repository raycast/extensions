import { LocalStorage, showToast, Toast } from "@raycast/api";
import { STORAGE_KEY } from "./types";
import type { Shortcut } from "./types";
import { normalizeShortcut } from "./schema";

export {
  generateId,
  normalizeShortcut,
  validateShortcut,
  parseJsonImport,
  distinctCategories,
  mergeShortcuts,
  isDuplicate,
} from "./schema";

const CORRUPT_KEY = `${STORAGE_KEY}.corrupt`;

export async function loadShortcuts(): Promise<Shortcut[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeShortcut) : [];
  } catch {
    await LocalStorage.setItem(CORRUPT_KEY, raw);
    showToast({
      style: Toast.Style.Failure,
      title: "Stored shortcuts were unreadable",
      message: "Raw payload backed up under the shortcuts.corrupt key",
    });
    return [];
  }
}

export async function saveShortcuts(items: Shortcut[]): Promise<void> {
  const normalized = items.map(normalizeShortcut);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}
