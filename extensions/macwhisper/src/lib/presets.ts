import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { ExportStyle, Grouping, OutputFormat, TranscribeOptions } from "./mw";

export type Preset = {
  id: string;
  name: string;
  format: OutputFormat;
  style?: ExportStyle;
  group?: Grouping;
  speakers?: boolean;
  speakerNames?: boolean;
  timestamps?: boolean;
  endTimestamps?: boolean;
  milliseconds?: boolean;
  maxCharsPerLine?: number;
  fps?: number;
};

const STORAGE_KEY = "export-presets";

export const MEETING_NOTES_OPTIONS: TranscribeOptions = {
  format: "md",
  style: "transcript",
  group: "people",
  speakers: true,
  speakerNames: true,
  timestamps: true,
};

export const DEFAULT_PRESETS: Preset[] = [
  { id: "subtitles-srt", name: "Subtitles (SRT, 42 chars)", format: "srt", style: "subtitles", maxCharsPerLine: 42 },
  { id: "subtitles-vtt", name: "Web Subtitles (VTT)", format: "vtt", style: "subtitles", maxCharsPerLine: 42 },
  { id: "meeting-notes", name: "Meeting Notes (Markdown by Speaker)", ...MEETING_NOTES_OPTIONS, format: "md" },
  { id: "timestamped-text", name: "Timestamped Text", format: "txt", style: "segments", timestamps: true },
  { id: "avid-25", name: "Avid DS Subtitles (25 fps)", format: "avid", fps: 25 },
];

export async function loadPresets(): Promise<Preset[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (raw === undefined) return DEFAULT_PRESETS;
  try {
    const parsed = JSON.parse(raw) as Preset[];
    return Array.isArray(parsed) ? parsed : DEFAULT_PRESETS;
  } catch {
    return DEFAULT_PRESETS;
  }
}

export async function savePresets(presets: Preset[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function newPresetId(): string {
  return randomUUID();
}

export function presetOptions(preset: Preset): TranscribeOptions {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, name, ...options } = preset;
  return options;
}

export function describePreset(preset: Preset): string {
  const parts: string[] = [preset.format.toUpperCase()];
  if (preset.style) parts.push(preset.style);
  if (preset.group && preset.group !== "none" && preset.style === "transcript") parts.push(`by ${preset.group}`);
  if (preset.timestamps) parts.push("timestamps");
  if (preset.speakers) parts.push("speakers");
  if (preset.maxCharsPerLine) parts.push(`${preset.maxCharsPerLine} chars/line`);
  if (preset.fps) parts.push(`${preset.fps} fps`);
  return parts.join(" · ");
}
