import { LocalStorage } from "@raycast/api";
import { ShortcutIndex } from "./drive-shortcuts";

const KEY = "shortcuts";
const CAPACITY = 8_000_000;

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

export async function saveShortcutIndex(
  index: ShortcutIndex,
): Promise<boolean> {
  const raw = JSON.stringify(index);
  // Reject oversized unions before writing, never discard saved paths to fit.
  if (Buffer.byteLength(raw, "utf8") > CAPACITY) return false;
  try {
    await LocalStorage.setItem(KEY, raw);
    return true;
  } catch {
    return false;
  }
}
