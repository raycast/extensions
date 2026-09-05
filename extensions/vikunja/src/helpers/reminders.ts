import { TaskReminder } from "../api";

/**
 * The Vikunja web client sends the Unix epoch as the `reminder` value for
 * relative reminders instead of null, and the server ignores the field when
 * `relative_to` is present. Mirrored here so our payload matches the official
 * frontend exactly.
 */
const RELATIVE_REMINDER_PLACEHOLDER = new Date(0).toISOString();

const SECONDS_A_HOUR = 3600;
const SECONDS_A_DAY = 86400;

/**
 * Preset offsets, mirroring the web client's reminder presets.
 *
 * Negative values mean "before the due date". Quick Add only ever resolves a
 * due date, so `relative_to` is always `due_date`; the other anchors the API
 * supports would always be empty here.
 */
export const REMINDER_PRESETS = [
  { value: "none", title: "No reminder", seconds: null },
  { value: "on-due", title: "At the due date", seconds: 0 },
  { value: "2h-before", title: "2 hours before", seconds: -2 * SECONDS_A_HOUR },
  { value: "1d-before", title: "1 day before", seconds: -1 * SECONDS_A_DAY },
  { value: "3d-before", title: "3 days before", seconds: -3 * SECONDS_A_DAY },
  { value: "1w-before", title: "1 week before", seconds: -7 * SECONDS_A_DAY },
  {
    value: "30d-before",
    title: "30 days before",
    seconds: -30 * SECONDS_A_DAY,
  },
] as const;

export type ReminderPreset = (typeof REMINDER_PRESETS)[number]["value"];

function findPreset(preset: string | undefined) {
  return REMINDER_PRESETS.find((p) => p.value === preset);
}

/** True when the preset would add a reminder (i.e. anything but "none"). */
export function isReminderEnabled(preset: string | undefined): boolean {
  const found = findPreset(preset);
  return found !== undefined && found.seconds !== null;
}

/** Display label for a preset, or null when it adds no reminder. */
export function formatReminderPreset(
  preset: string | undefined,
): string | null {
  const found = findPreset(preset);
  if (!found || found.seconds === null) return null;
  return found.title;
}

/**
 * Builds the reminder payload for a new task.
 *
 * Returns an empty list when no preset is configured or when the task has no
 * due date, since a due-date-relative reminder has nothing to anchor to.
 */
export function buildDefaultReminders(
  preset: string | undefined,
  hasDueDate: boolean,
): TaskReminder[] {
  const found = findPreset(preset);
  if (!found || found.seconds === null || !hasDueDate) {
    return [];
  }

  return [
    {
      reminder: RELATIVE_REMINDER_PLACEHOLDER,
      relative_period: found.seconds,
      relative_to: "due_date",
    },
  ];
}
