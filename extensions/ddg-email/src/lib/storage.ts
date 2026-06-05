import { LocalStorage } from "@raycast/api";
import type { RecentAlias, StoredSession } from "../types/ddg";

const STORAGE_KEYS = {
  session: "ddg-email.session",
  recentAliases: "ddg-email.recentAliases",
} as const;

const RECENT_ALIAS_LIMIT = 20;

async function readJson<T>(key: string): Promise<T | undefined> {
  const raw = await LocalStorage.getItem<string>(key);

  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    await LocalStorage.removeItem(key);
    return undefined;
  }
}

export async function getStoredSession() {
  return readJson<StoredSession>(STORAGE_KEYS.session);
}

export async function saveStoredSession(session: StoredSession) {
  await LocalStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
}

export async function clearStoredSession() {
  await LocalStorage.removeItem(STORAGE_KEYS.session);
}

export async function getRecentAliases() {
  return (await readJson<RecentAlias[]>(STORAGE_KEYS.recentAliases)) ?? [];
}

export async function saveRecentAlias(alias: Omit<RecentAlias, "createdAt">) {
  const aliases = await getRecentAliases();
  const nextAliases = [
    {
      ...alias,
      createdAt: new Date().toISOString(),
    },
    ...aliases.filter((item) => item.fullAddress !== alias.fullAddress),
  ].slice(0, RECENT_ALIAS_LIMIT);

  await LocalStorage.setItem(
    STORAGE_KEYS.recentAliases,
    JSON.stringify(nextAliases),
  );
  return nextAliases;
}

export async function clearRecentAliases() {
  await LocalStorage.removeItem(STORAGE_KEYS.recentAliases);
}
