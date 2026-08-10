import { LocalStorage } from "@raycast/api";
import { FileCategory } from "./backends";

export const PREFERENCE_KEYS: Partial<Record<FileCategory, string>> = {
  presentation: "preferredPresentation",
  document: "preferredDocument",
  spreadsheet: "preferredSpreadsheet",
  image: "preferredImage",
};

export async function loadPreferences(): Promise<Record<string, string>> {
  const keys = Object.values(PREFERENCE_KEYS) as string[];
  const values = await Promise.all(keys.map((key) => LocalStorage.getItem<string>(key)));
  return Object.fromEntries(keys.map((key, i) => [key, values[i] ?? "auto"]));
}

export function preferredEngine(prefs: Record<string, string>, category: FileCategory): string {
  const key = PREFERENCE_KEYS[category];
  return (key && prefs[key]) || "auto";
}
