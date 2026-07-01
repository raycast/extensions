/**
 * things-internals.ts
 *
 * Reverse-engineered internals of the Things 3 SQLite database.
 *
 * WARNING: Everything in this file is based on unofficial reverse engineering of
 * Things' internal data format. Cultured Code does not document or support direct
 * database access. Any Things update may change the schema, encoding, or sentinel
 * values without notice. Assertions in this module detect breakage early.
 *
 * Covered internals:
 *   - Packed-date encoding: Things stores calendar dates as packed integers using
 *     bitwise shifts: (year << 16) | (month << 12) | (day << 7)
 *   - Sentinel values: special packed-date constants used as placeholders
 *   - Recurring deadline resolution: recurring tasks store a relative offset in a
 *     plist XML blob (rt1_recurrenceRule) instead of an absolute deadline
 */

import type { ResolvedDates } from './types';

// ---------------------------------------------------------------------------
// Schema description
// ---------------------------------------------------------------------------

/**
 * The minimum set of tables and columns required for the SQL query path to work
 * correctly. Used by assertDatabaseSchema() in api-sql.ts to detect Things
 * updates that break the internal database format before any query runs.
 *
 * Only columns that are actively read or filtered on are listed — columns that
 * are merely cosmetic or unused are omitted intentionally.
 */
export const REQUIRED_SCHEMA: Record<string, string[]> = {
  TMTask: [
    'uuid',
    'title',
    'notes',
    'status',
    'trashed',
    'type',
    'start',
    'startDate',
    'deadline',
    'rt1_recurrenceRule',
    'rt1_nextInstanceStartDate',
    'rt1_repeatingTemplate',
    'project',
    'area',
    'index',
    'creationDate',
    'stopDate',
    'userModificationDate',
    'todayIndex',
  ],
  TMArea: ['uuid', 'title', 'visible'],
  TMChecklistItem: ['uuid', 'title', 'status', 'task', 'index'],
  TMTag: ['uuid', 'title', 'parent'],
  TMTaskTag: ['tasks', 'tags'],
  TMAreaTag: ['areas', 'tags'],
};

// ---------------------------------------------------------------------------
// Packed-date encoding
// ---------------------------------------------------------------------------

const YEAR_SHIFT = 16;
const MONTH_SHIFT = 12;
const DAY_SHIFT = 7;
const MONTH_MASK = 0xf;
const DAY_MASK = 0x1f;

/**
 * Placeholder stored in `deadline` when a recurring task's deadline is relative
 * to each instance's start date (rather than a fixed date). Decodes to year ~4001.
 */
export const RECURRING_DEADLINE_PLACEHOLDER = 262213760;

/**
 * Placeholder stored in `rt1_nextInstanceStartDate` before the first instance is
 * scheduled. Decodes to a small non-zero packed value that must be ignored.
 */
export const NEXT_INSTANCE_PLACEHOLDER = 69760;

/** Decode a Things packed-date integer to "YYYY-MM-DD", or null if invalid/placeholder. */
export function convertThingsDate(value: number): string | null {
  if (!value || value === RECURRING_DEADLINE_PLACEHOLDER || value === NEXT_INSTANCE_PLACEHOLDER) return null;
  const year = value >> YEAR_SHIFT;
  const month = (value >> MONTH_SHIFT) & MONTH_MASK;
  const day = (value >> DAY_SHIFT) & DAY_MASK;
  if (year <= 0 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

/** Encode a calendar date to a Things packed-date integer. */
export function encodeThingsDate(year: number, month: number, day: number): number {
  return (year << YEAR_SHIFT) | (month << MONTH_SHIFT) | (day << DAY_SHIFT);
}

/** Returns a Things packed-date covering all timestamps within today (end-of-day boundary). */
export function getEndOfToday(): number {
  const now = new Date();
  return encodeThingsDate(now.getFullYear(), now.getMonth() + 1, now.getDate()) + 127;
}

/** Add N calendar days to a Things packed-date integer and re-encode. */
export function addDaysToThingsDate(packedDate: number, days: number): number | null {
  const dateStr = convertThingsDate(packedDate);
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return encodeThingsDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * Assert that the packed-date codec round-trips correctly.
 * Call this once at startup to detect if Things has changed its date encoding.
 */
export function assertPackedDateEncoding(): void {
  const packed = encodeThingsDate(2026, 6, 11);
  const decoded = convertThingsDate(packed);
  const expected = '2026-06-11';
  if (decoded !== expected) {
    throw new Error(
      `Things date calculation has changed — dates may be incorrect. Expected "${expected}", got "${decoded}".`,
    );
  }
}

// ---------------------------------------------------------------------------
// Recurring deadline resolution
// ---------------------------------------------------------------------------

/**
 * Parse the recurrence deadline offset (in days) from a Things plist XML recurrence
 * rule stored in the `rt1_recurrenceRule` column.
 *
 * The `ts` key holds a signed integer: positive = deadline is N days after the
 * instance start date, negative = deadline is N days before.
 */
export function parseDeadlineOffset(plistXml: unknown): number | null {
  if (!plistXml || typeof plistXml !== 'string') return null;
  const match = plistXml.match(/<key>ts<\/key>\s*<integer>(-?\d+)<\/integer>/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/**
 * Resolve effective dates for a todo or project row.
 *
 * Handles three cases:
 *   1. Normal task: decode startDate and deadline directly.
 *   2. Recurring task with relative deadline: deadline column holds
 *      RECURRING_DEADLINE_PLACEHOLDER; compute the real date from the recurrence
 *      rule offset + nextInstanceStartDate.
 *   3. Recurring task instance: deadline is already an absolute packed-date.
 */
export function resolveEffectiveDates(
  startDate: number,
  deadline: number,
  nextInstanceStartDate: number,
  recurrenceRule: unknown,
): ResolvedDates {
  // Effective start: prefer startDate, fall back to nextInstanceStartDate (unless placeholder)
  let effectiveStartDate: string | null = null;
  if (startDate) {
    effectiveStartDate = convertThingsDate(startDate);
  } else if (nextInstanceStartDate && nextInstanceStartDate !== NEXT_INSTANCE_PLACEHOLDER) {
    effectiveStartDate = convertThingsDate(nextInstanceStartDate);
  }

  // Recurring deadline: placeholder indicates deadline is relative to next instance
  if (deadline === RECURRING_DEADLINE_PLACEHOLDER) {
    const offset = parseDeadlineOffset(recurrenceRule);
    if (offset !== null && nextInstanceStartDate) {
      const computedPacked = addDaysToThingsDate(nextInstanceStartDate, offset);
      const effectiveDeadline = computedPacked !== null ? convertThingsDate(computedPacked) : null;
      return { effectiveDeadline, effectiveStartDate, dueDateIsRecurring: true };
    }
    return { effectiveDeadline: null, effectiveStartDate, dueDateIsRecurring: true };
  }

  if (deadline) {
    return { effectiveDeadline: convertThingsDate(deadline), effectiveStartDate, dueDateIsRecurring: false };
  }

  return { effectiveDeadline: null, effectiveStartDate, dueDateIsRecurring: false };
}
