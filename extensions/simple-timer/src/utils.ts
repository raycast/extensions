import { LocalStorage } from "@raycast/api";

const VOLUME_KEY = "timer-volume";
export const DEFAULT_VOLUME = 75;

export async function getVolume(): Promise<number> {
  const v = await LocalStorage.getItem<number>(VOLUME_KEY);
  return v ?? DEFAULT_VOLUME;
}

export async function setVolume(v: number): Promise<void> {
  await LocalStorage.setItem(VOLUME_KEY, v);
}


const ALERT_DURATION_KEY = "alert-duration";
export const DEFAULT_ALERT_DURATION = 0; // 0 = until dismissed

export const ALERT_DURATION_OPTIONS = [
  { label: "5 seconds",          seconds: 5 },
  { label: "15 seconds",         seconds: 15 },
  { label: "1 minute",           seconds: 60 },
  { label: "Until dismissed",    seconds: 0 },
];

export async function getAlertDuration(): Promise<number> {
  const v = await LocalStorage.getItem<number>(ALERT_DURATION_KEY);
  return v ?? DEFAULT_ALERT_DURATION;
}

export async function setAlertDuration(v: number): Promise<void> {
  await LocalStorage.setItem(ALERT_DURATION_KEY, v);
}

const NOTIFICATIONS_KEY = "notifications-enabled";

export async function getNotificationsEnabled(): Promise<boolean> {
  const v = await LocalStorage.getItem<boolean>(NOTIFICATIONS_KEY);
  return v ?? true;
}

export async function setNotificationsEnabled(v: boolean): Promise<void> {
  await LocalStorage.setItem(NOTIFICATIONS_KEY, v);
}

// Tries to extract a time token from a string.
// Returns { seconds, note } or null if no time found.
// Rules:
//   - bare number alone (e.g. "3") is NOT a time
//   - number must have unit: 3m, 3s, 3h, 1h30, 30m20, @18:00, at 6pm, etc.
export function parseFullInput(input: string): { seconds: number; note: string } | null {
  const raw = input.trim();
  if (!raw) return null;

  // Helper: parse a pure time string (no note)
  function parseTimeOnly(s: string): number | null {
    const t = s.trim().toLowerCase();
    if (!t) return null;

    // Target time: @18:00, @6pm, @6:30pm, at 18:00, at 6pm
    const atMatch = t.match(/^(?:@|at\s+)(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (atMatch) {
      let hours = parseInt(atMatch[1]);
      const minutes = parseInt(atMatch[2] ?? "0");
      const meridiem = atMatch[3];
      if (meridiem === "pm" && hours < 12) hours += 12;
      if (meridiem === "am" && hours === 12) hours = 0;
      const now = new Date();
      const target = new Date();
      target.setHours(hours, minutes, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      const diff = Math.round((target.getTime() - now.getTime()) / 1000);
      return diff > 0 ? diff : null;
    }

    // Smart combos: 1h30 → 1h30m, 30m20 → 30m20s (must be ONLY digits+h+digits or digits+m+digits)
    const smartHM = t.match(/^(\d+)h(\d+)$/);
    if (smartHM) return parseInt(smartHM[1]) * 3600 + parseInt(smartHM[2]) * 60;
    const smartMS = t.match(/^(\d+)m(\d+)$/);
    if (smartMS) return parseInt(smartMS[1]) * 60 + parseInt(smartMS[2]);

    // Extract h/m/s components — at least one unit must be present
    const hMatch = t.match(/(\d+)\s*(?:h(?:ours?)?|hodiny?|hod)/i);
    const mMatch = t.match(/(\d+)\s*(?:m(?:in(?:utes?)?)?|minut(?:a|y)?)/i);
    const sMatch = t.match(/(\d+)\s*(?:s(?:ec(?:onds?)?)?|sekund(?:a|y)?)/i);

    if (!hMatch && !mMatch && !sMatch) return null;

    // Make sure the whole token is only time (no extra words)
    // Strip known time patterns and check nothing text-like remains
    const stripped = t
      .replace(/(\d+)\s*(?:h(?:ours?)?|hodiny?|hod)/i, "")
      .replace(/(\d+)\s*(?:m(?:in(?:utes?)?)?|minut(?:a|y)?)/i, "")
      .replace(/(\d+)\s*(?:s(?:ec(?:onds?)?)?|sekund(?:a|y)?)/i, "")
      .replace(/[\s,]+/g, "")
      .trim();

    if (stripped.length > 0) return null; // leftover text = not pure time

    const h = hMatch ? parseInt(hMatch[1]) : 0;
    const m = mMatch ? parseInt(mMatch[1]) : 0;
    const sec = sMatch ? parseInt(sMatch[1]) : 0;
    const total = h * 3600 + m * 60 + sec;
    return total > 0 ? total : null;
  }

  // 1) Try entire input as time (no note)
  const direct = parseTimeOnly(raw);
  if (direct !== null) return { seconds: direct, note: "" };

  // 2) note + time: text ends, time token at end
  //    Time token = \d+[hms] or \d+h\d+ or \d+m\d+ or @/at... or word units
  const timeTokenPattern = /(?:@\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?|at\s+\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?|\d+h\d+|\d+m\d+|\d+\s*(?:hours?|h\b)|\d+\s*(?:minutes?|mins?|m\b)|\d+\s*(?:seconds?|secs?|s\b)|\d+h\d*m?\d*s?)/i;

  const timeAtEnd = raw.match(new RegExp(`^(.+?)\\s+(${timeTokenPattern.source})$`, "i"));
  if (timeAtEnd) {
    const note = timeAtEnd[1].trim();
    const timePart = timeAtEnd[2].trim();
    const secs = parseTimeOnly(timePart);
    if (secs !== null) return { seconds: secs, note };
  }

  // 3) time + note: time token first, rest is note
  const timeAtStart = raw.match(new RegExp(`^(${timeTokenPattern.source})\\s+(.+)$`, "i"));
  if (timeAtStart) {
    const timePart = timeAtStart[1].trim();
    const note = timeAtStart[2].trim();
    const secs = parseTimeOnly(timePart);
    if (secs !== null) return { seconds: secs, note };
  }

  return null;
}

export function parseInput(input: string): number | null {
  return parseFullInput(input)?.seconds ?? null;
}

// Returns a human-readable label for target-time inputs
export function parseInputLabel(input: string): string | null {
  const raw = input.trim().toLowerCase();
  // Check full input or time part
  const full = parseFullInput(input);
  if (!full) return null;

  // Check if original time part was an @/at pattern
  const atMatch = raw.match(/(?:@|at\s+)(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!atMatch) return null;

  let hours = parseInt(atMatch[1]);
  const minutes = parseInt(atMatch[2] ?? "0");
  const meridiem = atMatch[3];
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;

  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  if (target <= new Date()) target.setDate(target.getDate() + 1);

  const hh = target.getHours().toString().padStart(2, "0");
  const mm = target.getMinutes().toString().padStart(2, "0");
  return `until ${hh}:${mm}`;
}

// Format seconds into human-readable label: "5 minutes", "1 hour 30 minutes", "90 seconds"
export function formatLabel(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts: string[] = [];
  if (h > 0) parts.push(`${h} ${h === 1 ? "hour" : "hours"}`);
  if (m > 0) parts.push(`${m} ${m === 1 ? "minute" : "minutes"}`);
  if (s > 0) parts.push(`${s} ${s === 1 ? "second" : "seconds"}`);

  return parts.join(" ") || "0 seconds";
}

// Format seconds as MM:SS or HH:MM:SS for the running display
export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");

  if (h > 0) {
    const hh = h.toString().padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export const PRESETS: { label: string; seconds: number }[] = [
  { label: "1 minute", seconds: 60 },
  { label: "2 minutes", seconds: 120 },
  { label: "5 minutes", seconds: 300 },
  { label: "10 minutes", seconds: 600 },
  { label: "30 minutes", seconds: 1800 },
  { label: "1 hour", seconds: 3600 },
];

const SOUND_KEY = "timer-sound";
export const DEFAULT_SOUND = "alert.wav";

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export interface PomodoroInput {
  workSeconds: number;
  breakSeconds: number;
  note: string;
  maxCycles: number; // 0 = infinite
}


export interface PomodoroInput {
  workSeconds: number;
  breakSeconds: number;
  note: string;
  maxCycles: number; // 0 = infinite
}

// Parse time string like: 25m, 5m30s, 1h30m, 45s, 2h, 33m40s
function parsePomoTime(s: string): number | null {
  const t = s.trim().toLowerCase();
  let total = 0;
  const re = /(\d+)\s*(h|m|s)/g;
  let match;
  let found = false;
  while ((match = re.exec(t)) !== null) {
    found = true;
    const n = parseInt(match[1]);
    if (match[2] === "h") total += n * 3600;
    else if (match[2] === "m") total += n * 60;
    else if (match[2] === "s") total += n;
  }
  return found ? total : null;
}

// Matches: pomo:25m:5m | pomodoro:33m40s:7m3s | note pomo:25m:5m | pomo:25m:5m note
export function parsePomodoroInput(raw: string): PomodoroInput | "setup" | null {
  const t = raw.trim().replace(/^\[/, "").replace(/\]$/, "").trim();

  // Keyword only → setup
  if (/^pomo(?:doro)?$/i.test(t)) return "setup";

  // Match pomo keyword position first, then extract note before/after
  const re = /^(.*?)pomo(?:doro)?[:;]([0-9hms]+)[:;]([0-9hms]+)(?:[:;](\d+))?(.*)$/i;
  const m = t.match(re);
  if (!m) return null;

  const noteBefore = (m[1] ?? "").trim();
  const workStr   = m[2].trim();
  const breakStr  = m[3].trim();
  const cyclesStr = m[4] ?? "";
  const noteAfter = (m[5] ?? "").trim();
  const note = [noteBefore, noteAfter].filter(Boolean).join(" ");

  const work = parsePomoTime(workStr);
  const brk  = parsePomoTime(breakStr);
  if (!work || !brk) return null;

  const maxCycles = cyclesStr ? parseInt(cyclesStr) : 0;

  return { workSeconds: work, breakSeconds: brk, note, maxCycles };
}

export function isPomodoroKeyword(input: string): boolean {
  const t = input.trim().toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  return t.startsWith("pomo");
}

export function generateSuggestions(input: string): { seconds: number; label: string }[] {
  const t = input.trim();
  if (!t) return [];

  // Extract leading number
  const numMatch = t.match(/^(\d+(\.\d+)?)$/);
  if (!numMatch) return [];

  const n = parseFloat(numMatch[1]);
  if (isNaN(n) || n <= 0) return [];

  const results: { seconds: number; label: string }[] = [];

  // X minutes (most common)
  results.push({ seconds: Math.round(n * 60), label: `${n} ${n === 1 ? "minute" : "minutes"}` });

  // X * 10 minutes (e.g. typing "5" → 50 minutes)
  const tenX = n * 10;
  if (tenX <= 1440) // max 24h
    results.push({ seconds: Math.round(tenX * 60), label: `${tenX} minutes` });

  // X seconds
  results.push({ seconds: Math.round(n), label: `${n} ${n === 1 ? "second" : "seconds"}` });

  // X hours (only if reasonable)
  if (n <= 24)
    results.push({ seconds: Math.round(n * 3600), label: `${n} ${n === 1 ? "hour" : "hours"}` });

  // Filter out duplicates and zero/negative
  const seen = new Set<number>();
  return results.filter(r => {
    if (r.seconds <= 0 || seen.has(r.seconds)) return false;
    seen.add(r.seconds);
    return true;
  });
}

export function isStopwatchInput(input: string): boolean {
  const t = input.trim().toLowerCase();
  return t === "stopwatch" || t === "sw" || 
         t.startsWith("sw ") || t.startsWith("stopwatch ") ||
         t.endsWith(" sw") || t.endsWith(" stopwatch");
}

export function parseStopwatchNote(input: string): string {
  const t = input.trim();
  const lower = t.toLowerCase();
  if (lower.startsWith("sw ")) return t.slice(3).trim();
  if (lower.startsWith("stopwatch ")) return t.slice(10).trim();
  if (lower.endsWith(" sw")) return t.slice(0, -3).trim();
  if (lower.endsWith(" stopwatch")) return t.slice(0, -10).trim();
  return "";
}

export const SOUND_OPTIONS = [
  { id: "alert.wav",  label: "Bell" },
  { id: "alert2.wav", label: "Chime" },
  { id: "alert3.wav", label: "Pulse" },
  { id: "alert4.wav", label: "Soft" },
  { id: "alert5.wav", label: "Digital" },
  { id: "",           label: "No Sound" },
];

export async function getSound(): Promise<string> {
  const v = await LocalStorage.getItem<string>(SOUND_KEY);
  return v ?? DEFAULT_SOUND;
}

export async function setSound(id: string): Promise<void> {
  await LocalStorage.setItem(SOUND_KEY, id);
}

const PRESETS_KEY = "custom-presets";

export const DEFAULT_PRESETS: { label: string; seconds: number }[] = [
  { label: "1 minute",  seconds: 60 },
  { label: "2 minutes", seconds: 120 },
  { label: "5 minutes", seconds: 300 },
  { label: "10 minutes", seconds: 600 },
  { label: "30 minutes", seconds: 1800 },
  { label: "1 hour",    seconds: 3600 },
];

export async function getPresets(): Promise<{ label: string; seconds: number }[]> {
  const raw = await LocalStorage.getItem<string>(PRESETS_KEY);
  if (!raw) return DEFAULT_PRESETS;
  try { return JSON.parse(raw); } catch { return DEFAULT_PRESETS; }
}

export async function savePresets(presets: { label: string; seconds: number }[]): Promise<void> {
  await LocalStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}
