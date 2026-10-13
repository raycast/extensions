import { getPreferenceValues } from "@raycast/api";
import { homedir } from "node:os";
import { join } from "node:path";

export interface Preferences {
  outputDir?: string;
  fps: string;
  maxWidth: string;
  encoder: "auto" | "ffmpeg" | "gifski";
  countdown: string;
  maxDuration: string;
  showClicks: boolean;
  showCursor: boolean;
  ffmpegPath?: string;
}

export const prefs = () => getPreferenceValues<Preferences>();

export function outputDir(): string {
  const dir = prefs().outputDir?.trim() || "~/Downloads";

  return dir.startsWith("~") ? join(homedir(), dir.slice(1)) : dir;
}
