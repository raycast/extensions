import { LocalStorage } from "@raycast/api";
import { STORAGE_KEYS } from "./constants";
import type { PlaybackState } from "../types";

const DEFAULT_STATE: PlaybackState = {
  isPlaying: false,
  activeSounds: [],
  masterVolume: 80,
};

export async function getPlaybackState(): Promise<PlaybackState> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.PLAYBACK_STATE);
  if (!raw) return { ...DEFAULT_STATE };
  try {
    return JSON.parse(raw) as PlaybackState;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function setPlaybackState(state: PlaybackState): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.PLAYBACK_STATE, JSON.stringify(state));
}

export async function updatePlaybackState(updater: (prev: PlaybackState) => PlaybackState): Promise<PlaybackState> {
  const current = await getPlaybackState();
  const next = updater(current);
  await setPlaybackState(next);
  return next;
}

export { DEFAULT_STATE };
