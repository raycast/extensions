import { LocalStorage } from "@raycast/api";

const KEY = "frecency.v1";

type FrecencyMap = Record<string, { count: number; lastUsed: number }>;

async function read(): Promise<FrecencyMap> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as FrecencyMap;
  } catch {
    return {};
  }
}

async function write(map: FrecencyMap): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(map));
}

export async function recordCall(
  contactId: string,
  phoneValue: string,
): Promise<void> {
  const key = `${contactId}::${phoneValue}`;
  const map = await read();
  const prev = map[key] ?? { count: 0, lastUsed: 0 };
  map[key] = { count: prev.count + 1, lastUsed: Date.now() };
  await write(map);
}

export async function getFrecency(): Promise<FrecencyMap> {
  return read();
}

export function frecencyScore(entry?: {
  count: number;
  lastUsed: number;
}): number {
  if (!entry) return 0;
  const ageDays = (Date.now() - entry.lastUsed) / (1000 * 60 * 60 * 24);
  const recencyDecay = Math.exp(-ageDays / 30);
  return entry.count * recencyDecay;
}
