import { LocalStorage } from "@raycast/api";

const PLAYBACK_SPEED_KEY = "playback-speed";

export const SPEED_STEP = 0.25;
export const SPEED_MIN = 0.5;
export const SPEED_MAX = 2.0;

export function clampSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return 1;
  // Snap to 0.25 grid so repeated taps land on familiar values.
  const stepped = Math.round(speed * 4) / 4;
  return Math.max(SPEED_MIN, Math.min(SPEED_MAX, stepped));
}

export function formatSpeed(speed: number): string {
  const rounded = Math.round(speed * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}.0×` : `${rounded}×`;
}

export async function readPlaybackSpeed(): Promise<number | null> {
  const raw = await LocalStorage.getItem<string>(PLAYBACK_SPEED_KEY);
  if (raw == null) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return clampSpeed(parsed);
}

export async function writePlaybackSpeed(speed: number): Promise<number> {
  const next = clampSpeed(speed);
  await LocalStorage.setItem(PLAYBACK_SPEED_KEY, String(next));
  return next;
}

export async function clearPlaybackSpeed(): Promise<void> {
  await LocalStorage.removeItem(PLAYBACK_SPEED_KEY);
}
