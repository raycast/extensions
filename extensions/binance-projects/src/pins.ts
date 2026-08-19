import { LocalStorage } from "@raycast/api";

const PINS_KEY = "pinned-v1";

export async function getPins(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(PINS_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

async function setPins(pins: string[]): Promise<void> {
  await LocalStorage.setItem(PINS_KEY, JSON.stringify(pins));
}

export async function togglePin(projectPath: string): Promise<string[]> {
  const pins = await getPins();
  const next = pins.includes(projectPath) ? pins.filter((p) => p !== projectPath) : [projectPath, ...pins];
  await setPins(next);
  return next;
}

export async function prunePins(existingPaths: Set<string>): Promise<string[]> {
  const pins = await getPins();
  const next = pins.filter((p) => existingPaths.has(p));
  if (next.length !== pins.length) await setPins(next);
  return next;
}
