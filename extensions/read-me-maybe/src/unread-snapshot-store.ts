import { LocalStorage } from "@raycast/api";

import { parseUnreadSnapshot, serializeUnreadSnapshot, type UnreadSnapshot } from "./domain/unread-snapshot";

export const unreadSnapshotStorageKey = "unread-snapshot";

export async function loadUnreadSnapshot(): Promise<UnreadSnapshot | undefined> {
  const stored = await LocalStorage.getItem<string>(unreadSnapshotStorageKey);
  return parseUnreadSnapshot(stored);
}

export async function saveUnreadSnapshot(snapshot: UnreadSnapshot): Promise<void> {
  await LocalStorage.setItem(unreadSnapshotStorageKey, serializeUnreadSnapshot(snapshot));
}
