import { LocalStorage } from "@raycast/api";

const LAST_VOLUME_KEY = "lastVolume";
const DEFAULT_UNMUTE_VOLUME = 0.5;
const VOLUME_STEP = 0.1;

export function stepVolume(volume: number, direction: 1 | -1): number {
  const next = Math.min(1, Math.max(0, volume + direction * VOLUME_STEP));
  return Math.round(next * 100) / 100;
}

export async function toggleMuteVolume(volume: number): Promise<number> {
  if (volume > 0) {
    await LocalStorage.setItem(LAST_VOLUME_KEY, volume);
    return 0;
  }
  const last = await LocalStorage.getItem<number>(LAST_VOLUME_KEY);
  return last !== undefined && last > 0 ? last : DEFAULT_UNMUTE_VOLUME;
}
