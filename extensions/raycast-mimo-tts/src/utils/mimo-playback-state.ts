import { LocalStorage } from "@raycast/api";

const NOW_PLAYING_KEY = "mimo-tts:now-playing";
const SPEED_OVERRIDE_KEY = "mimo-tts:speed-override";
const STOP_REQUEST_KEY = "mimo-tts:stop-requested-at";

export type PlaybackStatus = "synthesizing" | "playing" | "idle" | "error";

export interface NowPlayingState {
  status: PlaybackStatus;
  voiceId: string;
  voiceName: string;
  modelLabel: string;
  textPreview: string;
  totalChunks: number;
  /** 0-indexed playing chunk; -1 when only first chunk is being synthesized. */
  currentChunk: number;
  startedAt: number;
  errorMessage?: string;
  source?: string;
  /** Heartbeat: refreshed on every write so a crashed reading can be detected. */
  updatedAt?: number;
}

export const SPEED_MIN = 0.5;
export const SPEED_MAX = 2.0;
export const SPEED_STEP = 0.25;
export const SPEED_NORMAL = 1.0;

export async function getNowPlaying(): Promise<NowPlayingState | null> {
  const raw = await LocalStorage.getItem<string>(NOW_PLAYING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NowPlayingState;
  } catch {
    return null;
  }
}

export async function setNowPlaying(state: NowPlayingState): Promise<void> {
  await LocalStorage.setItem(NOW_PLAYING_KEY, JSON.stringify({ ...state, updatedAt: Date.now() }));
}

// patchNowPlaying runs setNowPlaying on every chunk, so updatedAt is a live
// heartbeat. A playing/synthesizing state with no recent heartbeat (or none
// at all, e.g. a pre-upgrade leftover) was left by a crashed process and must
// not swallow the next Quick Read trigger as a phantom stop.
const NOW_PLAYING_STALE_AFTER_MS = 5 * 60 * 1000;

export function isNowPlayingFresh(state: NowPlayingState, now: number = Date.now()): boolean {
  if (typeof state.updatedAt !== "number") return false;
  return now - state.updatedAt < NOW_PLAYING_STALE_AFTER_MS;
}

export async function patchNowPlaying(patch: Partial<NowPlayingState>): Promise<NowPlayingState | null> {
  const current = await getNowPlaying();
  if (!current) return null;
  const next = { ...current, ...patch };
  await setNowPlaying(next);
  return next;
}

export async function clearNowPlaying(): Promise<void> {
  await LocalStorage.removeItem(NOW_PLAYING_KEY);
}

export async function markIdle(): Promise<void> {
  const current = await getNowPlaying();
  if (!current) return;
  await setNowPlaying({ ...current, status: "idle" });
}

export async function markError(message: string): Promise<void> {
  const current = await getNowPlaying();
  if (current) {
    await setNowPlaying({ ...current, status: "error", errorMessage: message });
    return;
  }
  await setNowPlaying({
    status: "error",
    voiceId: "",
    voiceName: "",
    modelLabel: "",
    textPreview: "",
    totalChunks: 0,
    currentChunk: -1,
    startedAt: Date.now(),
    errorMessage: message,
  });
}

export async function requestPlaybackStop(): Promise<void> {
  await LocalStorage.setItem(STOP_REQUEST_KEY, String(Date.now()));
}

export async function clearPlaybackStopRequest(): Promise<void> {
  await LocalStorage.removeItem(STOP_REQUEST_KEY);
}

export async function hasPlaybackStopRequest(): Promise<boolean> {
  return Boolean(await LocalStorage.getItem<string>(STOP_REQUEST_KEY));
}

// ---- Speed override ----

export async function getSpeedOverride(): Promise<number | null> {
  const raw = await LocalStorage.getItem<string>(SPEED_OVERRIDE_KEY);
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return clampSpeed(n);
}

export async function setSpeedOverride(rate: number): Promise<number> {
  const clamped = clampSpeed(rate);
  await LocalStorage.setItem(SPEED_OVERRIDE_KEY, String(clamped));
  return clamped;
}

export async function clearSpeedOverride(): Promise<void> {
  await LocalStorage.removeItem(SPEED_OVERRIDE_KEY);
}

export async function adjustSpeed(delta: number, fallback: number): Promise<number> {
  const current = (await getSpeedOverride()) ?? fallback;
  return setSpeedOverride(current + delta);
}

export function clampSpeed(rate: number): number {
  const stepped = roundToStep(rate);
  if (stepped < SPEED_MIN) return SPEED_MIN;
  if (stepped > SPEED_MAX) return SPEED_MAX;
  return stepped;
}

export function roundToStep(rate: number): number {
  return Math.round(rate / SPEED_STEP) * SPEED_STEP;
}

export function formatSpeed(rate: number): string {
  const fixed = rate.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${fixed}x`;
}

/**
 * Parse a rate string from configured defaults, form values, or LocalStorage.
 *
 * Supports both modern decimal values ("1.25", "0.5", "2") and legacy
 * percentage offsets used by earlier versions ("-50" = 0.5x, "100" = 2x).
 */
export function parseRateString(value: string | undefined | null): number {
  if (value === undefined || value === null || value === "") return SPEED_NORMAL;
  const direct = Number(value);
  if (!Number.isFinite(direct)) return SPEED_NORMAL;
  if (direct >= SPEED_MIN - 0.001 && direct <= SPEED_MAX + 0.001) {
    return clampSpeed(direct);
  }
  // Legacy percentage offset: 0 = normal, 25 = +25%, -50 = -50%
  return clampSpeed(1 + direct / 100);
}

export function rateToInstruction(rate: number): string {
  if (rate <= 0.55) return "Speak slowly and calmly, with clear pauses.";
  if (rate <= 0.8) return "Speak at a slightly relaxed pace.";
  if (rate <= 1.05) return "";
  if (rate <= 1.3) return "Speak at a lightly brisk pace while keeping articulation clear.";
  if (rate <= 1.55) return "Speak quickly, but keep the rhythm natural and intelligible.";
  if (rate <= 1.8) return "Speak briskly with crisp articulation and clear delivery.";
  return "Speak very quickly while preserving clear pronunciation.";
}
