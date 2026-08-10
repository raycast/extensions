import { LocalStorage } from "@raycast/api";
import { FileCategory } from "./backends";

export type PreferredCategory = Exclude<FileCategory, "other">;
export type Preferences = Record<FileCategory, string>;

const KEYS: Record<PreferredCategory, string> = {
  presentation: "preferredPresentation",
  document: "preferredDocument",
  spreadsheet: "preferredSpreadsheet",
  image: "preferredImage",
};

export const DEFAULT_PREFERENCES: Preferences = {
  presentation: "auto",
  document: "auto",
  spreadsheet: "auto",
  image: "auto",
  other: "auto",
};

export async function loadPreferences(): Promise<Preferences> {
  const categories = Object.keys(KEYS) as PreferredCategory[];
  const values = await Promise.all(categories.map((c) => LocalStorage.getItem<string>(KEYS[c])));
  const prefs = { ...DEFAULT_PREFERENCES };
  categories.forEach((c, i) => (prefs[c] = values[i] ?? "auto"));
  return prefs;
}

export async function setPreference(category: PreferredCategory, value: string): Promise<void> {
  await LocalStorage.setItem(KEYS[category], value);
}
