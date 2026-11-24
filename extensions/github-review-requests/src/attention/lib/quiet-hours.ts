/**
 * Do-not-disturb window arithmetic. Kept free of Raycast imports so it stays
 * pure, testable logic.
 */

/** Just the fields the window needs, so callers can pass the whole settings object. */
export type QuietWindow = {
  /** Start of the window as "HH:MM", or "" for none. */
  quietFrom: string;
  /** End of the window as "HH:MM", or "" for none. */
  quietTo: string;
};

/** Parses "HH:MM" into minutes past midnight, or undefined when malformed. */
export function parseClock(value: string): number | undefined {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return undefined;
  return hours * 60 + minutes;
}

/**
 * Reports whether `now` falls inside the configured window. The window may
 * wrap past midnight, so 18:00 → 09:00 covers evenings and nights. An
 * unset, malformed, or zero-length window is never active.
 */
export function inQuietHours(window: QuietWindow, now = new Date()): boolean {
  const from = parseClock(window.quietFrom);
  const to = parseClock(window.quietTo);
  if (from === undefined || to === undefined || from === to) return false;

  const minutes = now.getHours() * 60 + now.getMinutes();
  return from < to
    ? minutes >= from && minutes < to // same-day window
    : minutes >= from || minutes < to; // wraps past midnight
}

/** A human description of the window, for the settings UI. */
export function quietHoursLabel(window: QuietWindow): string {
  const from = parseClock(window.quietFrom);
  const to = parseClock(window.quietTo);
  if (from === undefined || to === undefined || from === to) return "Off";
  return `${window.quietFrom} – ${window.quietTo}`;
}
