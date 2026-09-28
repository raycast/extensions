import { LocalStorage } from "@raycast/api";
import { randomUUID } from "crypto";
import { clampVolume, findSound, loadMix, Mix, MixInput, playingCount } from "./player";

export type Preset = {
  id: string;
  name: string;
  sounds: MixInput;
  masterVolume: number;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  lastUsedAt?: number;
};

/** How a preset relates to the current mix. "modified" means it was loaded last but the mix has changed since. */
export type PresetStatus = "playing" | "paused" | "modified";

const STORAGE_KEY = "moodist-presets";
const STORAGE_VERSION = 2;

// Earlier releases stored a bare array with 0–100 volumes and their own sound ids.
const LEGACY_SOUND_IDS: Record<string, string> = {
  rain: "light-rain",
  thunderstorm: "thunder",
  "ocean-waves": "waves",
  "river-stream": "river",
  wind: "wind",
  birds: "birds",
  "summer-night": "crickets",
  campfire: "campfire",
  forest: "wind-in-trees",
  "coffee-shop": "cafe",
  "city-street": "busy-street",
  train: "train",
  "keyboard-typing": "keyboard",
  "clock-ticking": "clock",
  "white-noise": "white-noise",
  "pink-noise": "pink-noise",
  "brown-noise": "brown-noise",
  "alpha-waves": "binaural-alpha",
  "beta-waves": "binaural-beta",
  "theta-waves": "binaural-theta",
  "delta-waves": "binaural-delta",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePreset(raw: unknown, legacy: boolean): Preset | undefined {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.name !== "string" || !Array.isArray(raw.sounds)) {
    return undefined;
  }
  const scale = legacy ? 100 : 1;
  const sounds: MixInput = [];
  for (const s of raw.sounds) {
    if (!isRecord(s) || typeof s.soundId !== "string" || typeof s.volume !== "number") continue;
    const soundId = legacy ? LEGACY_SOUND_IDS[s.soundId] : s.soundId;
    if (!soundId || !findSound(soundId) || sounds.some((x) => x.soundId === soundId)) continue;
    sounds.push({ soundId, volume: clampVolume(s.volume / scale) });
  }
  const now = Date.now();
  return {
    id: raw.id,
    name: raw.name,
    sounds,
    masterVolume: typeof raw.masterVolume === "number" ? clampVolume(raw.masterVolume / scale) : 1,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : now,
    pinned: raw.pinned === true || undefined,
    lastUsedAt: typeof raw.lastUsedAt === "number" ? raw.lastUsedAt : undefined,
  };
}

/** Pinned first, then most recently used, then newest. */
function comparePresets(a: Preset, b: Preset): number {
  if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
  return (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0) || b.createdAt - a.createdAt;
}

function assertNameAvailable(presets: Preset[], name: string, exceptId?: string) {
  const taken = presets.find((p) => p.id !== exceptId && p.name.toLowerCase() === name.toLowerCase());
  if (taken) throw new Error(`A preset named "${taken.name}" already exists`);
}

async function writePresets(presets: Preset[]) {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, presets }));
}

export async function getPresets(): Promise<Preset[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  const legacy = Array.isArray(data);
  let list: unknown[] = [];
  if (Array.isArray(data)) list = data;
  else if (isRecord(data) && Array.isArray(data.presets)) list = data.presets;
  const presets = list.map((p) => parsePreset(p, legacy)).filter((p): p is Preset => !!p);
  if (legacy) await writePresets(presets);
  return presets.sort(comparePresets);
}

/** Match by id, then by exact name, then by a partial name that only one preset contains. Case-insensitive. */
export function findPreset(presets: Preset[], query: string): Preset | undefined {
  const q = query.trim().toLowerCase();
  const byId = presets.find((p) => p.id === query.trim());
  if (byId) return byId;
  const exact = presets.find((p) => p.name.toLowerCase() === q);
  if (exact) return exact;
  const partial = presets.filter((p) => p.name.toLowerCase().includes(q));
  return partial.length === 1 ? partial[0] : undefined;
}

export function presetStatus(preset: Preset, mix: Mix): PresetStatus | undefined {
  const ids = Object.keys(mix.sounds);
  if (ids.length === 0) return undefined;
  const same =
    mix.master === preset.masterVolume &&
    ids.length === preset.sounds.length &&
    preset.sounds.every((s) => mix.sounds[s.soundId]?.volume === s.volume);
  if (same) return playingCount(mix) > 0 ? "playing" : "paused";
  return mix.preset === preset.id ? "modified" : undefined;
}

export async function playPreset(preset: Preset) {
  await loadMix(preset.sounds, preset.masterVolume, preset.id);
  const presets = await getPresets();
  await writePresets(presets.map((p) => (p.id === preset.id ? { ...p, lastUsedAt: Date.now() } : p)));
}

export async function setPinned(id: string, pinned: boolean) {
  const presets = await getPresets();
  await writePresets(presets.map((p) => (p.id === id ? { ...p, pinned: pinned || undefined } : p)));
}

function soundsFromMix(mix: Mix): MixInput {
  return Object.entries(mix.sounds).map(([soundId, s]) => ({ soundId, volume: s.volume }));
}

export async function savePreset(name: string, mix: Mix): Promise<Preset> {
  const sounds = soundsFromMix(mix);
  if (sounds.length === 0) throw new Error("The mix is empty");
  const presets = await getPresets();
  assertNameAvailable(presets, name);
  const now = Date.now();
  const preset: Preset = { id: randomUUID(), name, sounds, masterVolume: mix.master, createdAt: now, updatedAt: now };
  await writePresets([...presets, preset]);
  return preset;
}

async function updatePreset(id: string, update: (preset: Preset) => Preset) {
  const presets = await getPresets();
  await writePresets(presets.map((p) => (p.id === id ? { ...update(p), updatedAt: Date.now() } : p)));
}

export async function renamePreset(id: string, name: string) {
  assertNameAvailable(await getPresets(), name, id);
  await updatePreset(id, (p) => ({ ...p, name }));
}

export async function overwritePreset(id: string, mix: Mix) {
  const sounds = soundsFromMix(mix);
  if (sounds.length === 0) throw new Error("The mix is empty");
  await updatePreset(id, (p) => ({ ...p, sounds, masterVolume: mix.master }));
}

export async function deletePreset(id: string) {
  await writePresets((await getPresets()).filter((p) => p.id !== id));
}

export function describePreset(preset: Preset): string {
  return preset.sounds.map((s) => findSound(s.soundId)?.label ?? s.soundId).join(", ");
}
