import { LocalStorage } from "@raycast/api";
import { ShortcutIndex } from "./drive-shortcuts";

const KEY = "shortcuts";

const EMPTY: ShortcutIndex = {
  shortcuts: [],
  scannedAt: 0,
  available: false,
  partial: false,
};

export async function loadShortcutIndex(): Promise<ShortcutIndex> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as ShortcutIndex;
    return Array.isArray(parsed.shortcuts)
      ? { ...parsed, available: parsed.available ?? true }
      : EMPTY;
  } catch {
    return EMPTY;
  }
}

export async function saveShortcutIndex(index: ShortcutIndex): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(index));
}
