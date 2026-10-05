import { LocalStorage } from "@raycast/api";

export type PlaybackStatus = "synthesizing" | "playing" | "idle" | "error";

export interface NowPlayingState {
  status: PlaybackStatus;
  voiceId: string;
  voiceName: string;
  modelLabel: string;
  textPreview: string;
  totalChunks: number;
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

const NOW_PLAYING_STALE_AFTER_MS = 5 * 60 * 1000;

interface PlaybackStateOptions {
  parseLegacyRateOffset?: boolean;
}

export function createProviderPlaybackState(namespace: string, options: PlaybackStateOptions = {}) {
  const nowPlayingKey = `${namespace}:now-playing`;
  const speedOverrideKey = `${namespace}:speed-override`;
  const stopRequestKey = `${namespace}:stop-requested-at`;

  async function getNowPlaying(): Promise<NowPlayingState | null> {
    const raw = await LocalStorage.getItem<string>(nowPlayingKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as NowPlayingState;
    } catch {
      return null;
    }
  }

  async function setNowPlaying(state: NowPlayingState): Promise<void> {
    await LocalStorage.setItem(nowPlayingKey, JSON.stringify({ ...state, updatedAt: Date.now() }));
  }

  function isNowPlayingFresh(state: NowPlayingState, now: number = Date.now()): boolean {
    if (typeof state.updatedAt !== "number") return false;
    return now - state.updatedAt < NOW_PLAYING_STALE_AFTER_MS;
  }

  async function patchNowPlaying(patch: Partial<NowPlayingState>): Promise<NowPlayingState | null> {
    const current = await getNowPlaying();
    if (!current) return null;
    const next = { ...current, ...patch };
    await setNowPlaying(next);
    return next;
  }

  async function clearNowPlaying(): Promise<void> {
    await LocalStorage.removeItem(nowPlayingKey);
  }

  async function markIdle(): Promise<void> {
    const current = await getNowPlaying();
    if (!current) return;
    await setNowPlaying({ ...current, status: "idle" });
  }

  async function markError(message: string): Promise<void> {
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

  async function requestPlaybackStop(): Promise<void> {
    await LocalStorage.setItem(stopRequestKey, String(Date.now()));
  }

  async function clearPlaybackStopRequest(): Promise<void> {
    await LocalStorage.removeItem(stopRequestKey);
  }

  async function hasPlaybackStopRequest(): Promise<boolean> {
    return Boolean(await LocalStorage.getItem<string>(stopRequestKey));
  }

  async function getSpeedOverride(): Promise<number | null> {
    const raw = await LocalStorage.getItem<string>(speedOverrideKey);
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return clampSpeed(n);
  }

  async function setSpeedOverride(rate: number): Promise<number> {
    const clamped = clampSpeed(rate);
    await LocalStorage.setItem(speedOverrideKey, String(clamped));
    return clamped;
  }

  async function clearSpeedOverride(): Promise<void> {
    await LocalStorage.removeItem(speedOverrideKey);
  }

  async function adjustSpeed(delta: number, fallback: number): Promise<number> {
    const current = (await getSpeedOverride()) ?? fallback;
    return setSpeedOverride(current + delta);
  }

  function parseRateString(value: string | undefined | null): number {
    return parseRateValue(value, options);
  }

  return {
    getNowPlaying,
    setNowPlaying,
    isNowPlayingFresh,
    patchNowPlaying,
    clearNowPlaying,
    markIdle,
    markError,
    requestPlaybackStop,
    clearPlaybackStopRequest,
    hasPlaybackStopRequest,
    getSpeedOverride,
    setSpeedOverride,
    clearSpeedOverride,
    adjustSpeed,
    clampSpeed,
    roundToStep,
    parseRateString,
    formatSpeed,
  };
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

export function parseRateValue(value: string | undefined | null, options: PlaybackStateOptions = {}): number {
  if (value === undefined || value === null || value === "") return SPEED_NORMAL;
  const direct = Number(value);
  if (!Number.isFinite(direct)) return SPEED_NORMAL;
  if (options.parseLegacyRateOffset && (direct < SPEED_MIN - 0.001 || direct > SPEED_MAX + 0.001)) {
    return clampSpeed(1 + direct / 100);
  }
  return clampSpeed(direct);
}

export function formatSpeed(rate: number): string {
  const fixed = rate.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${fixed}x`;
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
