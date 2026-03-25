export interface ConversionSettings {
  inputPath: string;
  quality: number;
  maxWidth: string; // "original" | number as string
  fps: number;
  speed: number;
  loopMode: "loop" | "none";
  trimStart?: string; // "MM:SS" or "HH:MM:SS"
  trimEnd?: string;
}

export interface VideoMetadata {
  duration: number; // seconds
  width: number;
  height: number;
  fileSize: number; // bytes
  codec: string;
}

export interface HistoryEntry {
  id: string;
  inputPath: string;
  outputPath: string;
  fileSize: number; // bytes
  createdAt: string; // ISO date string
  settings: ConversionSettings;
}

export interface ConversionProgress {
  percentage: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
}

export interface Preferences {
  outputFolder: string;
  defaultQuality: string;
  defaultMaxWidth: string;
  defaultFps: string;
  defaultLoopMode: "loop" | "none";
  longVideoThreshold: string;
}

export const SUPPORTED_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"];

export const WIDTH_PRESETS = [
  { title: "Original", value: "original" },
  { title: "320px", value: "320" },
  { title: "480px", value: "480" },
  { title: "640px", value: "640" },
  { title: "800px", value: "800" },
  { title: "1080px", value: "1080" },
];

export const SPEED_PRESETS = [
  { title: "0.25x", value: "0.25" },
  { title: "0.5x", value: "0.5" },
  { title: "1x (Normal)", value: "1" },
  { title: "1.5x", value: "1.5" },
  { title: "2x", value: "2" },
];
