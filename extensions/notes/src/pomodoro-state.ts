import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { exec } from "child_process";

export type SessionType = "work" | "break";

export interface PomodoroState {
  sessionType: SessionType;
  /** Unix ms when the timer was started/resumed */
  startedAt: number;
  /** Seconds that were remaining when the timer was started/resumed */
  remainingAtStart: number;
  isRunning: boolean;
  sessionsCompleted: number;
  /** Prevents repeat completion sound from background ticks */
  soundPlayed?: boolean;
}

export const DURATIONS: Record<SessionType, number> = {
  work: 25 * 60,
  break: 5 * 60,
};

export const LABELS: Record<SessionType, string> = {
  work: "Focus",
  break: "Break",
};

const KEY = "pomodoro-state";

export async function loadState(): Promise<PomodoroState | null> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return null;
  return JSON.parse(raw) as PomodoroState;
}

export async function persistState(state: PomodoroState): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(state));
}

export async function clearState(): Promise<void> {
  await LocalStorage.removeItem(KEY);
}

/** Compute seconds remaining right now from persisted state */
export function computeRemaining(state: PomodoroState): number {
  if (!state.isRunning) return state.remainingAtStart;
  const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
  return Math.max(0, state.remainingAtStart - elapsed);
}

export function playCompletionSound(): void {
  if (process.platform === "win32") {
    exec('powershell -c "[System.Media.SystemSounds]::Asterisk.Play()"');
  } else {
    exec("afplay /System/Library/Sounds/Glass.aiff");
  }
}

const DEFAULT_SPOTIFY_URI = "spotify:playlist:0vvXsWCC9xrXsKd4FyS8kM";

function getSpotifyUri(): string {
  try {
    const prefs = getPreferenceValues<{ spotifyUri?: string }>();
    const uri = prefs.spotifyUri?.trim();
    return uri && uri.startsWith("spotify:") ? uri : DEFAULT_SPOTIFY_URI;
  } catch {
    return DEFAULT_SPOTIFY_URI;
  }
}

export function playSpotify(): void {
  const uri = getSpotifyUri();
  if (process.platform === "win32") {
    exec(`powershell -c "Start-Process '${uri}'"`);
  } else {
    exec(`open '${uri}'`);
  }
}

export function pauseSpotify(): void {
  if (process.platform === "win32") {
    exec('powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]0xB3)"');
  } else {
    exec("osascript -e 'tell application \"Spotify\" to pause'");
  }
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
