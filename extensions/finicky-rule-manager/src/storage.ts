import { LocalStorage } from "@raycast/api";
import { Rule } from "./types";

const STORAGE_KEY = "finickyRules.v1";

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
