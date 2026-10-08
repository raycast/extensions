import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { Rule } from "./types";

const STORAGE_KEY = "finickyRules.v1";
const DEFAULT_BROWSER_KEY = "defaultBrowser";

export async function loadRules(): Promise<Rule[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Rule[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveRules(rules: Rule[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export async function getDefaultBrowser(): Promise<string> {
  const stored = await LocalStorage.getItem<string>(DEFAULT_BROWSER_KEY);
  if (stored) return stored;

  const preferences = getPreferenceValues<{ defaultBrowser?: string }>();
  return preferences.defaultBrowser || "Brave Browser";
}

export async function setDefaultBrowser(browser: string): Promise<void> {
  await LocalStorage.setItem(DEFAULT_BROWSER_KEY, browser);
}
