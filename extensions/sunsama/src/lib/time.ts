/**
 * Pure parsing and formatting helpers. Kept free of any Raycast / MCP imports
 * so they are trivially unit-testable.
 */
import { SubtaskInput } from "./types";

/**
 * Parse a human duration into minutes. Accepts:
 *   - a plain number → minutes ("90" → 90)
 *   - h:mm clock form ("1:15" → 75)
 *   - unit forms, combinable ("1h", "1hr", "30m", "30 min", "1h 30m", "1.5h")
 *   - Sunsama's MCP strings ("1 hours and 55 minutes", "0 minutes")
 * Returns null when the input can't be understood (empty or unrecognized).
 */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;

  // h:mm (e.g. 1:15 → 75)
  const clock = s.match(/^(\d+):([0-5]?\d)$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);

  // bare number → minutes
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s));

  // unit form: optional hours and/or minutes, in any order. The (?![a-z])
  // lookahead (instead of \b) lets concatenated units like "1hr30min" parse.
  const hours = s.match(/(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr|h)(?![a-z])/);
  const minutes = s.match(
    /(\d+(?:\.\d+)?)\s*(?:minutes|minute|mins|min|m)(?![a-z])/,
  );
  if (!hours && !minutes) return null;

  const total =
    (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
  return Math.round(total);
}

/** Format a minutes value as "45m", "1h", or "1h 30m". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/** Format elapsed seconds as "h:mm:ss". */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Split a textarea into one subtask per non-empty line. */
export function parseSubtasks(raw: string): SubtaskInput[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((title) => ({ title }));
}
