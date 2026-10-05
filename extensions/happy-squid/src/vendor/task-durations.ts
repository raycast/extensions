/**
 * ── How long a task runs, chosen from buttons ─────────────────────────────────
 *
 * A task's length is picked before it starts and never afterwards: the six
 * buttons on New Task are the whole of it, and a running task has no duration
 * control anywhere in the product (Anton, 2026-09-03). What replaced the two
 * h/m boxes is a grid of five FIXED lengths plus one slot that holds a length
 * of the user's own.
 *
 * This file is the pure half of that — the option list, the selection, and the
 * digit entry behind "Custom". Both cards render it (the phone's
 * view/mobile/TaskScreen.tsx and the browser's view/components/NewTask), so
 * neither can drift into its own idea of what the buttons say.
 */

/**
 * The five fixed lengths, in the design's reading order — they fill positions
 * two to six of a three-column grid, under whichever length the first slot
 * holds.
 */
export const TASK_DURATION_PRESETS = [15, 30, 45, 60, 120] as const;

/**
 * What the first slot says on an install that has never typed a length of its
 * own — the design's "5m".
 */
export const DEFAULT_CUSTOM_TASK_MINUTES = 5;

/** The most digits "Custom" takes: `H MM`, so 9h 99m is the ceiling. */
export const CUSTOM_DIGIT_LIMIT = 3;

export interface TaskDurationChoices {
  /** Six lengths in reading order: the variable slot, then the five fixed ones. */
  options: number[];
  /**
   * WHICH BUTTON is drawn blue, by position rather than by value.
   *
   * An index and not a length, because the first slot may hold a number one of
   * the five fixed buttons already carries — that is the design (see below) —
   * and a selection stated as a value lights both of them.
   */
  selectedIndex: number;
}

/**
 * The six buttons and the one that is selected.
 *
 * `seedMinutes` is what this card opened wanting — the length of the recent task
 * that was tapped, or, on a plain New Task, `lastCustomMinutes` itself. It goes
 * in the FIRST slot and it is the selection, and it goes there whether or not
 * one of the five fixed buttons already carries that number (Anton,
 * 2026-09-03): a length lives in a fixed position, so tapping the same row twice
 * lights the same button both times, where moving the selection to a matching
 * fixed button would make the first slot mean something different depending on
 * what was tapped. A repeated `30m` is the price and it is the smaller one.
 *
 * `maxMinutes` is the free tier's ceiling (FREE_MAX_TASK_MINUTES), and it binds
 * the SELECTION only. The options above it are still drawn — the card greys
 * them, so the limit is said in the place the user is looking rather than by a
 * button quietly going missing.
 */
export function taskDurationChoices({
  seedMinutes,
  lastCustomMinutes,
  maxMinutes,
}: {
  seedMinutes?: number | null;
  lastCustomMinutes: number | null;
  maxMinutes?: number;
}): TaskDurationChoices {
  const own = lastCustomMinutes !== null && lastCustomMinutes > 0 ? lastCustomMinutes : DEFAULT_CUSTOM_TASK_MINUTES;
  const head = seedMinutes === undefined || seedMinutes === null || seedMinutes <= 0 ? own : seedMinutes;
  const options = [head, ...TASK_DURATION_PRESETS];
  const withinCap = (m: number): boolean => maxMinutes === undefined || m <= maxMinutes;
  if (withinCap(head)) return { options, selectedIndex: 0 };
  /* Over the ceiling, the selection falls to the longest option under it. The
     ceiling can only ever be FREE_MAX_TASK_MINUTES, which is one of the five, so
     in practice this lands on that button; written as a search all the same, so
     a ceiling that is not a preset still lands on a button rather than selecting
     a number no button carries. */
  let best = 0;
  for (let i = 1; i < options.length; i++) {
    if (withinCap(options[i]!) && options[i]! > (withinCap(options[best]!) ? options[best]! : -1)) best = i;
  }
  return { options, selectedIndex: best };
}

// ─── "Custom": digits that fill from the right ───────────────────────────────
//
// Android's own timer, which is what Anton asked for: the field starts at
// `0h 00m` and each digit typed pushes the ones already there one place to the
// left, so "5" is five minutes, "57" is fifty-seven, and the third digit is
// what promotes the value into hours. It is held as the DIGIT STRING rather
// than as a number of minutes, because "05" and "5" are the same number and
// different states of the field — one more keystroke tells them apart.

/**
 * Keeps only digits, and only as many as the field holds. It is the whole of
 * the entry rule, so it can sit on a plain `onChange` rather than on intercepted
 * keystrokes: a virtual numeric keypad, a hardware keyboard, a paste and an
 * autofill all arrive as a new value and all come out of here the same shape.
 *
 * A LEADING zero is dropped rather than stored — `0` typed into the empty field
 * would otherwise spend one of the three places saying nothing, so `0`, `5`
 * would read `0h 05m` and then have no room left for the hour.
 */
export function sanitizeCustomDigits(text: string, limit = CUSTOM_DIGIT_LIMIT): string {
  return text
    .replace(/[^0-9]/g, "")
    .replace(/^0+/, "")
    .slice(0, limit);
}

/** The field's two halves, zero-padded exactly as it draws them. */
export function customDigitParts(digits: string): { hours: string; minutes: string } {
  const padded = digits.padStart(CUSTOM_DIGIT_LIMIT, "0");
  return { hours: padded.slice(0, 1), minutes: padded.slice(1) };
}

/**
 * What the field is worth, in minutes.
 *
 * The minutes half is allowed past 59 — `175` reads `1h 75m` while it is being
 * typed, exactly as Android's timer lets it, and it is worth 135 minutes. The
 * BUTTON that records it afterwards spells that back as `2h 15m`, so the
 * overflow lives only for as long as the field is open.
 */
export function customDigitsToMinutes(digits: string): number {
  const { hours, minutes } = customDigitParts(digits);
  return Number(hours) * 60 + Number(minutes);
}

/**
 * The digits of a length spelled back as the field shows it once blur has
 * put the overflow right: 135 minutes is `2h 15m`, so `215`. The iPhone's
 * field types behind what it shows, so these are the digits it goes on from;
 * null when that spelling no longer fits the field's places.
 */
export function customDigitsFromMinutes(minutes: number): string | null {
  const digits = String(Math.floor(minutes / 60) * 100 + (minutes % 60)).replace(/^0+/, "");
  return digits.length <= CUSTOM_DIGIT_LIMIT ? digits : null;
}

/** Exact labels for duration inputs: 45m, 120m, 2h 15m. Task readouts use
 * formatHoursMinutes; choices retain their values so 90m and 120m stay distinct. */
export function formatTaskDurationLabel(minutes: number): string {
  if (minutes <= 120) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
