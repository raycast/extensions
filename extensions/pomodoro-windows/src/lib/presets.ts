import { LocalStorage } from "@raycast/api";
import { PresetSnapshot } from "./engine";

/** A saved focus setup: how long to focus and rest. */
export interface Preset {
  id: string;
  name: string;
  icon: string;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  /** What you work on with this preset, e.g. "Thesis". Used when you start it without typing a task. */
  taskName?: string;
}

const PRESETS_KEY = "pomodoro.presets.v1";
const DEFAULT_KEY = "pomodoro.defaultPreset.v1";

export const PRESET_ICONS = ["🍅", "🧠", "⚡", "📚", "💻", "✍️", "🎨", "🎧", "🏃", "🧘", "📈", "🔬"];

export const BUILT_IN_PRESETS: Preset[] = [
  {
    id: "classic",
    name: "Classic",
    icon: "🍅",
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
  },
  {
    id: "deep-work",
    name: "Deep Work",
    icon: "🧠",
    focusMinutes: 50,
    shortBreakMinutes: 10,
    longBreakMinutes: 20,
    longBreakEvery: 3,
  },
  {
    id: "quick",
    name: "Quick Sprint",
    icon: "⚡",
    focusMinutes: 15,
    shortBreakMinutes: 3,
    longBreakMinutes: 10,
    longBreakEvery: 4,
  },
];

/** Used for timers saved before presets existed. */
export const FALLBACK_SNAPSHOT: PresetSnapshot = toSnapshot(BUILT_IN_PRESETS[0]);

export function toSnapshot(p: Preset): PresetSnapshot {
  return {
    id: p.id,
    name: p.name,
    icon: p.icon,
    focusMs: Math.round(p.focusMinutes * 60_000),
    shortBreakMs: Math.round(p.shortBreakMinutes * 60_000),
    longBreakMs: Math.round(p.longBreakMinutes * 60_000),
    longBreakEvery: p.longBreakEvery,
  };
}

export async function loadPresets(): Promise<Preset[]> {
  const raw = await LocalStorage.getItem<string>(PRESETS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Preset[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fall through to defaults
    }
  }
  return BUILT_IN_PRESETS;
}

async function savePresets(presets: Preset[]): Promise<void> {
  await LocalStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

export async function upsertPreset(preset: Preset): Promise<void> {
  const presets = await loadPresets();
  const i = presets.findIndex((p) => p.id === preset.id);
  if (i >= 0) presets[i] = preset;
  else presets.push(preset);
  await savePresets(presets);
}

export async function setPresetTaskName(id: string, taskName: string): Promise<void> {
  const presets = await loadPresets();
  const preset = presets.find((p) => p.id === id);
  if (!preset) return;
  preset.taskName = taskName.trim() || undefined;
  await savePresets(presets);
}

export async function deletePreset(id: string): Promise<void> {
  const presets = (await loadPresets()).filter((p) => p.id !== id);
  if (presets.length === 0) return; // always keep at least one
  await savePresets(presets);
  if ((await getDefaultPresetId()) === id) await LocalStorage.removeItem(DEFAULT_KEY);
}

export async function movePreset(id: string, direction: -1 | 1): Promise<void> {
  const presets = await loadPresets();
  const i = presets.findIndex((p) => p.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= presets.length) return;
  [presets[i], presets[j]] = [presets[j], presets[i]];
  await savePresets(presets);
}

export async function getDefaultPresetId(): Promise<string | undefined> {
  return (await LocalStorage.getItem<string>(DEFAULT_KEY)) ?? undefined;
}

export async function setDefaultPreset(id: string): Promise<void> {
  await LocalStorage.setItem(DEFAULT_KEY, id);
}

/** The preset used when you just type a task and press Enter (or use Quick Toggle). */
export async function getDefaultPreset(): Promise<Preset> {
  const presets = await loadPresets();
  const id = await getDefaultPresetId();
  return presets.find((p) => p.id === id) ?? presets[0];
}

export function newPresetId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "preset"}-${Date.now().toString(36)}`;
}

export function presetSummary(p: Pick<Preset, "focusMinutes" | "shortBreakMinutes" | "longBreakMinutes">): string {
  return `${p.focusMinutes} min focus · ${p.shortBreakMinutes} min break · ${p.longBreakMinutes} min long break`;
}
