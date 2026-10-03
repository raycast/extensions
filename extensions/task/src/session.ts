import { environment, LocalStorage } from "@raycast/api";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { normalizeSession, type TaskSession } from "./timer";
export { createSession } from "./timer";

const STORAGE_KEY = "task-session";

export async function saveSession(session: TaskSession): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export async function readSession(): Promise<TaskSession | undefined> {
  try {
    // Menu actions write here; it is authoritative for pause/resume/manual end.
    const nativeState = await readFile(path.join(environment.supportPath, "menu-bar-session.json"), "utf8");
    return normalizeSession(JSON.parse(nativeState));
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
  }
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!stored) return undefined;
  // Expiry is derived from the deadline instead of writing from a background
  // reader, which could overwrite a newly started task.
  return normalizeSession(JSON.parse(stored));
}
