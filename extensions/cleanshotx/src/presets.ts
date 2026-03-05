import { LocalStorage } from "@raycast/api";
import { execSync } from "child_process";
import { randomUUID } from "crypto";

export interface Preset {
  id: string;
  name: string;
  width: number;
  height: number;
}

export const DEFAULT_PRESETS: Preset[] = [
  { id: "default-fullscreen", name: "Fullscreen", width: 0, height: 0 },
  { id: "default-75", name: "75% of Screen", width: 0, height: 0 },
  { id: "default-50", name: "50% of Screen", width: 0, height: 0 },
  { id: "default-1080p", name: "1080p", width: 1920, height: 1080 },
  { id: "default-720p", name: "720p", width: 1280, height: 720 },
  { id: "default-4k", name: "4K", width: 3840, height: 2160 },
  { id: "default-ig-story", name: "Instagram Story", width: 1080, height: 1920 },
  { id: "default-yt-shorts", name: "YouTube Shorts", width: 1080, height: 1920 },
];

const RELATIVE_PRESETS: Record<string, number> = {
  "default-fullscreen": 1,
  "default-75": 0.75,
  "default-50": 0.5,
};

const STORAGE_KEY = "custom-presets";

export async function getCustomPresets(): Promise<Preset[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Preset[];
  } catch {
    return [];
  }
}

export async function saveCustomPresets(presets: Preset[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export async function getAllPresets(): Promise<{ custom: Preset[]; defaults: Preset[] }> {
  const custom = await getCustomPresets();
  return { custom, defaults: DEFAULT_PRESETS };
}

export function createPreset(name: string, width: number, height: number): Preset {
  return { id: randomUUID(), name, width, height };
}

export function isRelativePreset(preset: Preset): boolean {
  return preset.id in RELATIVE_PRESETS;
}

export function resolvePreset(preset: Preset, screen: ScreenDimensions): Preset {
  const scale = RELATIVE_PRESETS[preset.id];
  if (scale == null) return preset;
  const width = Math.round(screen.width * scale);
  const height = Math.round(screen.height * scale);
  return { ...preset, width, height };
}

export function formatResolution(preset: Preset, screen?: ScreenDimensions): string {
  if (isRelativePreset(preset) && screen) {
    const resolved = resolvePreset(preset, screen);
    return `${resolved.width} × ${resolved.height}`;
  }
  if (isRelativePreset(preset)) return "Relative";
  return `${preset.width} × ${preset.height}`;
}

export interface ScreenDimensions {
  width: number;
  height: number;
}

// Returns logical point dimensions for each screen (matches CleanShot's coordinate system)
const NSSCREEN_SCRIPT = [
  'ObjC.import("AppKit");',
  "var s = $.NSScreen.screens;",
  "var r = [];",
  "for (var i = 0; i < s.count; i++) {",
  "  var f = s.objectAtIndex(i).frame;",
  "  r.push({w: f.size.width, h: f.size.height});",
  "}",
  "JSON.stringify(r)",
].join(" ");

export interface ScreenInfo {
  displays: ScreenDimensions[];
  primary: ScreenDimensions;
}

export const DEFAULT_SCREEN: ScreenDimensions = { width: 1920, height: 1080 };

export function getScreenInfo(): ScreenInfo {
  try {
    const output = execSync(`osascript -l JavaScript -e '${NSSCREEN_SCRIPT}'`, { encoding: "utf-8" }).trim();
    const raw: { w: number; h: number }[] = JSON.parse(output);
    const displays = raw.map(({ w, h }) => ({ width: w, height: h }));

    if (displays.length === 0) {
      return { displays: [DEFAULT_SCREEN], primary: DEFAULT_SCREEN };
    }

    return { displays, primary: displays[0] };
  } catch {
    return { displays: [DEFAULT_SCREEN], primary: DEFAULT_SCREEN };
  }
}

// CleanShot uses a coordinate system with (0,0) at the lower-left corner
export function getCenteredCoordinates(
  presetWidth: number,
  presetHeight: number,
  screenWidth: number,
  screenHeight: number,
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.round((screenWidth - presetWidth) / 2)),
    y: Math.max(0, Math.round((screenHeight - presetHeight) / 2)),
  };
}

export function buildRecordURL(preset: Preset, screen: ScreenDimensions, displayIndex = 0): string {
  const resolved = resolvePreset(preset, screen);
  const { x, y } = getCenteredCoordinates(resolved.width, resolved.height, screen.width, screen.height);

  const params = new URLSearchParams({
    x: String(x),
    y: String(y),
    width: String(resolved.width),
    height: String(resolved.height),
  });

  params.set("display", String(displayIndex + 1));

  return `cleanshot://record-screen?${params.toString()}`;
}

export function presetFitsScreen(preset: Preset, screen: ScreenDimensions): boolean {
  if (isRelativePreset(preset)) return true;
  return preset.width <= screen.width && preset.height <= screen.height;
}
