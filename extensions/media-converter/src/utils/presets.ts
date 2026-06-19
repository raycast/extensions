import { LocalStorage } from "@raycast/api";
import builtInPresetsFile from "../config/built-in-presets.json";
import {
  Preset,
  AllOutputExtension,
  QualitySettings,
  TrimOptions,
  MediaType,
  OUTPUT_ALL_EXTENSIONS,
} from "../types/media";

const USER_PRESETS_KEY = "user-presets";
const SCHEMA_VERSION = 1;

type StoredShape = { v: number; presets: Preset[] };

type RawPreset = {
  id: string;
  name: string;
  builtIn?: boolean;
  mediaType: MediaType | "gif";
  outputFormat: string;
  quality: unknown;
  trim?: TrimOptions;
  stripMetadata?: boolean;
  outputDir?: string;
  description?: string;
};

function normaliseRaw(raw: RawPreset, markBuiltIn: boolean): Preset | null {
  if (!OUTPUT_ALL_EXTENSIONS.includes(raw.outputFormat as (typeof OUTPUT_ALL_EXTENSIONS)[number])) {
    return null;
  }
  return {
    id: raw.id,
    name: raw.name,
    builtIn: markBuiltIn || raw.builtIn === true,
    mediaType: raw.mediaType,
    outputFormat: raw.outputFormat as AllOutputExtension,
    quality: raw.quality as QualitySettings,
    trim: raw.trim,
    stripMetadata: raw.stripMetadata,
    outputDir: raw.outputDir,
    description: raw.description,
  };
}

export function getBuiltInPresets(): Preset[] {
  const raw = builtInPresetsFile as { presets: RawPreset[] };
  return raw.presets.map((p) => normaliseRaw(p, true)).filter((p): p is Preset => p !== null);
}

async function readUser(): Promise<StoredShape> {
  const raw = (await LocalStorage.getItem<string>(USER_PRESETS_KEY)) ?? "";
  if (!raw) return { v: SCHEMA_VERSION, presets: [] };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.presets)) {
      const presets = parsed.presets
        .map((p: RawPreset) => normaliseRaw(p, false))
        .filter((p: Preset | null): p is Preset => p !== null);
      return { v: parsed.v ?? SCHEMA_VERSION, presets };
    }
  } catch (err) {
    console.warn("Failed to parse user presets, resetting:", err);
  }
  return { v: SCHEMA_VERSION, presets: [] };
}

async function writeUser(data: StoredShape): Promise<void> {
  await LocalStorage.setItem(USER_PRESETS_KEY, JSON.stringify(data));
}

export async function getUserPresets(): Promise<Preset[]> {
  const data = await readUser();
  return data.presets;
}

export async function getAllPresets(): Promise<Preset[]> {
  const user = await getUserPresets();
  return [...getBuiltInPresets(), ...user];
}

export async function findPreset(id: string): Promise<Preset | null> {
  const all = await getAllPresets();
  return all.find((p) => p.id === id) ?? null;
}

function newId(): string {
  return `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveUserPreset(preset: Omit<Preset, "id" | "builtIn"> & { id?: string }): Promise<Preset> {
  const data = await readUser();
  const id = preset.id ?? newId();
  const existing = data.presets.findIndex((p) => p.id === id);
  const toStore: Preset = { ...preset, id, builtIn: false };
  if (existing >= 0) data.presets[existing] = toStore;
  else data.presets.unshift(toStore);
  await writeUser(data);
  return toStore;
}

export async function deleteUserPreset(id: string): Promise<void> {
  const data = await readUser();
  data.presets = data.presets.filter((p) => p.id !== id);
  await writeUser(data);
}

export async function duplicatePreset(id: string, newName?: string): Promise<Preset | null> {
  const source = await findPreset(id);
  if (!source) return null;
  return saveUserPreset({
    name: newName ?? `${source.name} (copy)`,
    mediaType: source.mediaType,
    outputFormat: source.outputFormat,
    quality: source.quality,
    trim: source.trim,
    stripMetadata: source.stripMetadata,
    outputDir: source.outputDir,
    description: source.description,
  });
}
