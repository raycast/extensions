import { LocalStorage } from "@raycast/api";
import { parseSession, serializeSession } from "./migration";
import type { MigrationSession } from "./types";

const key = "migration-progress-v1";

export async function saveProgress(session: MigrationSession) {
  await LocalStorage.setItem(key, serializeSession(session));
}

export async function loadProgress(): Promise<MigrationSession | undefined> {
  const text = await LocalStorage.getItem<string>(key);
  return text ? parseSession(text) : undefined;
}

export async function deleteProgress() {
  await LocalStorage.removeItem(key);
}
