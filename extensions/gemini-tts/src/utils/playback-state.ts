import { LocalStorage } from "@raycast/api";
import type { TextSourceKind } from "./text-source";

const PLAYBACK_STATE_KEY = "playback-live-state";

export type PlaybackPhase = "synthesizing" | "playing" | "stopped" | "completed";

export interface PlaybackState {
  phase: PlaybackPhase;
  voiceId: string;
  source: TextSourceKind;
  textPreview: string;
  totalChars: number;
  chunkIndex: number;
  chunkTotal: number;
  /**
   * Speed used for the current chunk. Optional so that older persisted
   * states (written before live speed control existed) still parse.
   */
  speed?: number;
  updatedAt: string;
}

export async function writePlaybackState(state: PlaybackState): Promise<void> {
  await LocalStorage.setItem(PLAYBACK_STATE_KEY, JSON.stringify(state));
}

export async function readPlaybackState(): Promise<PlaybackState | null> {
  const raw = await LocalStorage.getItem<string>(PLAYBACK_STATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlaybackState;
  } catch {
    return null;
  }
}

export async function clearPlaybackState(): Promise<void> {
  await LocalStorage.removeItem(PLAYBACK_STATE_KEY);
}

export function buildTextPreview(text: string, maxChars = 60): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length === 0) return "";
  const chars = Array.from(trimmed);
  if (chars.length <= maxChars) return trimmed;
  return chars.slice(0, maxChars).join("") + "…";
}
