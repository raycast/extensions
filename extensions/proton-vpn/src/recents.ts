import { LocalStorage } from "@raycast/api";

const KEY = "recent-countries";
const MAX = 5;

export async function getRecentCountries(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((c) => typeof c === "string") : [];
  } catch {
    return [];
  }
}

export async function addRecentCountry(code: string): Promise<void> {
  const list = await getRecentCountries();
  const next = [code, ...list.filter((c) => c !== code)].slice(0, MAX);
  await LocalStorage.setItem(KEY, JSON.stringify(next));
}
