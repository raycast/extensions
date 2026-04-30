import { LocalStorage } from "@raycast/api";
import type { PRWithActivity } from "./types";

const CACHE_KEY = "gh_pr_data_cache";

export async function loadCachedPRs(): Promise<PRWithActivity[] | null> {
  const raw = await LocalStorage.getItem<string>(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PRWithActivity[];
  } catch {
    return null;
  }
}

export async function saveCachedPRs(prs: PRWithActivity[]): Promise<void> {
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(prs));
}
