import { LocalStorage } from "@raycast/api";

const KEY = "recent-lookups";
const MAX_RECENTS = 15;

export type RecentLookup = {
  ip: string;
  score: number;
  checkedAt: string;
};

export async function loadRecents(): Promise<RecentLookup[]> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentLookup[]) : [];
  } catch {
    return [];
  }
}

async function save(recents: RecentLookup[]): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(recents.slice(0, MAX_RECENTS)));
}

export async function rememberLookup(entry: RecentLookup): Promise<void> {
  const recents = await loadRecents();
  await save([entry, ...recents.filter((item) => item.ip !== entry.ip)]);
}

export async function forgetLookup(ip: string): Promise<void> {
  const recents = await loadRecents();
  await save(recents.filter((item) => item.ip !== ip));
}

export async function clearRecents(): Promise<void> {
  await LocalStorage.removeItem(KEY);
}
