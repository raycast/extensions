import { LocalStorage } from "@raycast/api";
import type { GeneratedIban } from "./lib";

export type IbanFormat = "grouped" | "compact";

export interface SavedIban extends GeneratedIban {
  format: IbanFormat;
  savedAt: string;
  note?: string;
}

const STORAGE_KEY = "saved-iban";

function isSavedIban(value: unknown): value is SavedIban {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.iban === "string" && typeof record.format === "string" && typeof record.savedAt === "string";
}

export async function saveIban(record: SavedIban): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export async function loadIban(): Promise<SavedIban | undefined> {
  try {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!raw) {
      return undefined;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isSavedIban(parsed)) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export function ibanText(record: SavedIban): string {
  return record.format === "grouped" ? record.formatted : record.iban;
}
