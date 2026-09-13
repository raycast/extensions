import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";

export interface StatusPreset {
  id: string;
  emoji: string;
  text: string;
}

export const PRESETS_KEY = "buzz.status.presets";
export const SEEDED_KEY = "buzz.status.presetsSeeded";

/**
 * Seeded once on first run. The seeded flag is stored separately from the list
 * so that deleting a starter preset makes it stay deleted, rather than being
 * restored the next time the list is empty.
 */
export const STARTER_PRESETS: Omit<StatusPreset, "id">[] = [
  { emoji: "\u{1F4C5}", text: "In a meeting" },
  { emoji: "\u{1F9E0}", text: "Focus time" },
  { emoji: "\u{1F374}", text: "Lunch" },
  { emoji: "\u{1F3D6}", text: "Out of office" },
  { emoji: "\u{1F3E1}", text: "Working remotely" },
  { emoji: "\u{1F334}", text: "On holiday" },
];

function isPreset(value: unknown): value is StatusPreset {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.emoji === "string" && typeof v.text === "string";
}

async function read(): Promise<StatusPreset[]> {
  const raw = await LocalStorage.getItem<string>(PRESETS_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    // A corrupt or hand-edited value must never brick the command, so anything
    // unexpected degrades to an empty list instead of throwing.
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPreset);
  } catch {
    return [];
  }
}

async function write(presets: StatusPreset[]): Promise<void> {
  await LocalStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

export async function listPresets(): Promise<StatusPreset[]> {
  const seeded = await LocalStorage.getItem<string>(SEEDED_KEY);
  if (!seeded) {
    const starters = STARTER_PRESETS.map((p) => ({ ...p, id: randomUUID() }));
    await write(starters);
    await LocalStorage.setItem(SEEDED_KEY, "true");
    return starters;
  }
  return read();
}

export async function createPreset(input: { emoji: string; text: string }): Promise<StatusPreset> {
  const preset: StatusPreset = { id: randomUUID(), emoji: input.emoji.trim(), text: input.text.trim() };
  const presets = await read();
  await write([...presets, preset]);
  return preset;
}

export async function updatePreset(id: string, input: { emoji: string; text: string }): Promise<void> {
  const presets = await read();
  await write(presets.map((p) => (p.id === id ? { ...p, emoji: input.emoji.trim(), text: input.text.trim() } : p)));
}

export async function deletePreset(id: string): Promise<void> {
  const presets = await read();
  await write(presets.filter((p) => p.id !== id));
}
