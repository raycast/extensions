import { LocalStorage } from "@raycast/api";
import {
  buildSavedResult,
  insertSavedResult,
  normalizeSavedResults,
  type SaveResultInput,
  type SavedResult,
} from "./saved-results-model";

export * from "./saved-results-model";

const STORAGE_KEY = "saved-results-v1";

export async function readSavedResults(): Promise<SavedResult[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return normalizeSavedResults(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function saveResult(input: SaveResultInput): Promise<SavedResult> {
  const existing = await readSavedResults();
  const result = buildSavedResult(input, existing, new Date().toISOString());
  await LocalStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(insertSavedResult(result, existing)),
  );
  return result;
}

export async function removeSavedResult(id: string): Promise<void> {
  const next = (await readSavedResults()).filter((item) => item.id !== id);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function clearSavedResults(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
