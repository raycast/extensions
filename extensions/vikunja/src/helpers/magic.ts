import { getPreferenceValues } from "@raycast/api";
import {
  Project,
  Label,
  User,
  addLabelsToTask,
  createLabel,
  createTask,
} from "../api";
import {
  PREFIXES,
  PrefixMode,
  cleanupItemText,
  parseTaskText,
} from "../quickAddMagic";
import type { ParsedTaskText } from "../quickAddMagic";
import { PRIORITY_MAP } from "./priorities";
import {
  buildDefaultReminders,
  formatReminderPreset,
  isReminderEnabled,
} from "./reminders";

/** Prefix used to mark a TagPicker value that refers to a not-yet-created label. */
export const NEW_LABEL_PREFIX = "new:";

const REPEAT_SECONDS: Record<string, number> = {
  hours: 3600,
  days: 86400,
  weeks: 604800,
  months: 2592000,
  years: 31536000,
};

const REPEAT_UNIT_LABEL: Record<string, string> = {
  hours: "hour",
  days: "day",
  weeks: "week",
  months: "month",
  years: "year",
};

/** Repeat units Quick Add can express, in ascending order. */
export const REPEAT_UNITS = [
  "hours",
  "days",
  "weeks",
  "months",
  "years",
] as const;

export type RepeatUnit = (typeof REPEAT_UNITS)[number];

/** Sentinel for "no repeat" in the confirmation form's unit dropdown. */
export const REPEAT_NONE = "none";

export interface RepeatSelection {
  unit: RepeatUnit | typeof REPEAT_NONE;
  amount: number;
}

export interface RepeatPayload {
  repeat_after: number;
  repeat_mode?: number;
}

/**
 * Converts a parsed repeat interval into the seconds-based API payload.
 *
 * Matches the Vikunja web frontend: months are 30 days and years are 365 days.
 * `repeat_mode` is only emitted for a monthly repeat (the API defaults to 0).
 * Returns undefined when there is no repeat, so both fields stay out of the payload.
 */
export function computeRepeat(
  repeats: ParsedTaskText["repeats"],
): RepeatPayload | undefined {
  if (!repeats) return undefined;
  return buildRepeatPayload(repeats.type, repeats.amount);
}

/**
 * Builds the repeat payload from a unit and amount.
 *
 * A one month interval also sets `repeat_mode = 1` (repeat by calendar month),
 * regardless of whether it came from parsing or from a manual edit, so the same
 * interval always behaves the same way.
 */
export function buildRepeatPayload(
  unit: string,
  amount: number,
): RepeatPayload | undefined {
  const multiplier = REPEAT_SECONDS[unit];
  if (multiplier === undefined) return undefined;

  const repeat_after = amount * multiplier;
  if (repeat_after <= 0) return undefined;

  const payload: RepeatPayload = { repeat_after };
  if (unit === "months" && amount === 1) {
    payload.repeat_mode = 1;
  }
  return payload;
}

/**
 * Turns a seconds interval back into a unit and amount for editing.
 *
 * Picks the largest unit that divides evenly, so 1209600 becomes 2 weeks rather
 * than 14 days. Falls back to hours when nothing divides cleanly.
 */
export function secondsToRepeat(seconds: number): RepeatSelection {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return { unit: REPEAT_NONE, amount: 1 };
  }

  for (const unit of [...REPEAT_UNITS].reverse()) {
    const multiplier = REPEAT_SECONDS[unit];
    if (seconds % multiplier === 0) {
      return { unit, amount: seconds / multiplier };
    }
  }

  return { unit: "hours", amount: Math.max(1, Math.round(seconds / 3600)) };
}

/** Human readable summary of a repeat interval, e.g. "every 2 weeks". */
export function formatRepeat(
  repeats: ParsedTaskText["repeats"],
): string | null {
  if (!repeats) return null;
  return formatRepeatParts(repeats.type, repeats.amount);
}

/** Human readable summary from a unit and amount. */
export function formatRepeatParts(unit: string, amount: number): string | null {
  const label = REPEAT_UNIT_LABEL[unit];
  if (!label) return null;
  return amount === 1 ? `every ${label}` : `every ${amount} ${label}s`;
}

/** Reads the configured Quick Add Magic prefix mode, defaulting to Vikunja syntax. */
export function getPrefixMode(): PrefixMode {
  const { quickAddMagicMode } = getPreferenceValues<Preferences>();
  switch (quickAddMagicMode) {
    case "todoist":
      return PrefixMode.Todoist;
    case "disabled":
      return PrefixMode.Disabled;
    default:
      return PrefixMode.Default;
  }
}

/** Resolves a parsed project name against the project list: exact title first, then identifier. */
export function resolveProject(
  parsedProject: string | null,
  projects: Project[],
): Project | null {
  if (!parsedProject) return null;
  const wanted = parsedProject.toLowerCase();
  return (
    projects.find((p) => p.title.toLowerCase() === wanted) ??
    projects.find((p) => p.identifier === parsedProject) ??
    null
  );
}

export interface ResolvedLabels {
  /** TagPicker values: existing labels as their numeric id, new ones as `new:<title>`. */
  values: string[];
  /** Titles that do not exist yet and would be created on submit. */
  missingTitles: string[];
}

/** Maps parsed label titles onto TagPicker values, flagging ones that need creating. */
export function resolveLabels(
  parsedLabels: string[],
  allLabels: Label[],
): ResolvedLabels {
  const byTitle = new Map<string, number>();
  allLabels.forEach((l) => byTitle.set(l.title.toLowerCase(), l.id));

  const values: string[] = [];
  const missingTitles: string[] = [];

  parsedLabels.forEach((title) => {
    const id = byTitle.get(title.toLowerCase());
    if (id !== undefined) {
      values.push(String(id));
    } else {
      values.push(`${NEW_LABEL_PREFIX}${title}`);
      missingTitles.push(title);
    }
  });

  return { values, missingTitles };
}

/** Splits TagPicker values into existing numeric ids and titles that still need creating. */
export function splitLabelValues(values: string[]): {
  existingIds: number[];
  newTitles: string[];
} {
  const existingIds: number[] = [];
  const newTitles: string[] = [];

  values.forEach((v) => {
    if (v.startsWith(NEW_LABEL_PREFIX)) {
      newTitles.push(v.slice(NEW_LABEL_PREFIX.length));
    } else {
      const id = parseInt(v);
      if (!isNaN(id)) existingIds.push(id);
    }
  });

  return { existingIds, newTitles };
}

export interface MagicPreview {
  /** Raw input, unchanged. */
  input: string;
  /** Full parser output. */
  parsed: ParsedTaskText;
  /** Task title after magic tokens were stripped. */
  title: string;
  /** Project matched from `+project`, if it exists. */
  project: Project | null;
  /** Set when `+project` was given but matched nothing. */
  unmatchedProject: string | null;
  /** TagPicker values for the parsed labels. */
  labelValues: string[];
  /** Parsed label titles that do not exist yet. */
  missingLabelTitles: string[];
  /** Repeat payload for the API, if any. */
  repeat: RepeatPayload | undefined;
  /** Human readable repeat summary, if any. */
  repeatText: string | null;
  /** Priority name for display, if a priority was parsed. */
  priorityLabel: string | null;
  /** Assignees are parsed but cannot be set through the v1 create API. */
  /** Names parsed from assignee tokens. Resolved against project members later. */
  assigneeNames: string[];
  /** Configured default reminder label, or null when none is set. */
  reminderLabel: string | null;
  /** True when a reminder is configured but the task has no due date to anchor it. */
  reminderNeedsDueDate: boolean;
  /** True when the title is empty after stripping tokens. */
  isEmpty: boolean;
}

/**
 * Parses raw input and resolves it against the loaded projects and labels,
 * producing everything both the preview list and the confirmation form need.
 */
export function buildMagicPreview(
  input: string,
  projects: Project[],
  labels: Label[],
  prefixMode: PrefixMode = getPrefixMode(),
): MagicPreview {
  const parsed = parseTaskText(input, prefixMode);

  // The parser leaves assignee tokens in the text because it cannot know which
  // users exist. We strip them all regardless, so the title stays stable
  // between the preview and the confirmation step and a mistyped name never
  // ends up in the task title.
  const assigneePrefix = PREFIXES[prefixMode]?.assignee;
  const title = (
    assigneePrefix && parsed.assignees.length > 0
      ? cleanupItemText(parsed.text, parsed.assignees, assigneePrefix)
      : parsed.text
  ).trim();

  const project = resolveProject(parsed.project, projects);
  const unmatchedProject =
    parsed.project !== null && project === null ? parsed.project : null;

  const { values: labelValues, missingTitles } = resolveLabels(
    parsed.labels,
    labels,
  );

  const repeat = computeRepeat(parsed.repeats);
  const { defaultReminder } = getPreferenceValues<Preferences>();

  return {
    input,
    parsed,
    title,
    project,
    unmatchedProject,
    labelValues,
    missingLabelTitles: missingTitles,
    repeat,
    repeatText: formatRepeat(parsed.repeats),
    priorityLabel:
      parsed.priority !== null
        ? (PRIORITY_MAP[parsed.priority] ?? String(parsed.priority))
        : null,
    assigneeNames: parsed.assignees,
    reminderLabel: formatReminderPreset(defaultReminder),
    reminderNeedsDueDate:
      isReminderEnabled(defaultReminder) && parsed.date === null,
    isEmpty: title.length === 0,
  };
}

/**
 * Creates any labels that do not exist yet, then returns the full id list to bind.
 * Called after the task exists so an abandoned flow never pollutes the label list.
 */
export async function materializeLabels(
  labelValues: string[],
): Promise<number[]> {
  const { existingIds, newTitles } = splitLabelValues(labelValues);
  const createdIds = await Promise.all(
    newTitles.map(async (title) => (await createLabel(title)).id),
  );
  return [...new Set([...existingIds, ...createdIds])];
}

export interface QuickAddOverrides {
  title?: string;
  description?: string;
  dueDate?: Date | null;
  priority?: number;
  isFavorite?: boolean;
  /** Pass null to clear the parsed repeat, or a payload to replace it. */
  repeat?: RepeatPayload | null;
  /** Project members resolved from the parsed assignee names. */
  assignees?: User[];
}

/** Creates the task, then creates and binds labels. Shared by both Quick Add steps. */
export async function submitQuickAdd(
  preview: MagicPreview,
  projectId: number,
  labelValues: string[],
  overrides: QuickAddOverrides = {},
) {
  const dueDate =
    overrides.dueDate !== undefined ? overrides.dueDate : preview.parsed.date;
  const repeat =
    overrides.repeat !== undefined
      ? (overrides.repeat ?? undefined)
      : preview.repeat;

  // Resolved against the final due date, so clearing the date in the
  // confirmation form also drops the reminder that depended on it.
  const { defaultReminder } = getPreferenceValues<Preferences>();
  const reminders = buildDefaultReminders(defaultReminder, dueDate !== null);

  const task = await createTask(projectId, {
    title: (overrides.title ?? preview.title).trim(),
    description: overrides.description?.trim() || undefined,
    due_date: dueDate ? dueDate.toISOString() : null,
    priority: overrides.priority ?? preview.parsed.priority ?? 0,
    is_favorite: overrides.isFavorite ?? false,
    repeat_after: repeat?.repeat_after,
    repeat_mode: repeat?.repeat_mode,
    reminders: reminders.length > 0 ? reminders : undefined,
    assignees:
      overrides.assignees && overrides.assignees.length > 0
        ? overrides.assignees
        : undefined,
  });

  const labelIds = await materializeLabels(labelValues);
  if (labelIds.length > 0) {
    await addLabelsToTask(task.id, labelIds);
  }

  return task;
}
