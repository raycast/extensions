import { formatDay } from "./dates";
import type { RitualTask, TaskEdits } from "./types";

/// The `when` dropdown's possible states. `"keep"` is distinct from `"today"`:
/// it means "scheduled for some other day", which the previous `scheduleOf`
/// collapsed into `"today"` — showing "When: Today" for a task scheduled next
/// Tuesday, and making "Today" a no-op on it because `when === initial`
/// already held.
///
/// The five quick-schedule words (`"tomorrow"` plus the four below) are
/// edit-mode-only additions — `scheduleOf` never returns them, they only
/// arrive by the user picking one from the dropdown — and are spelled to
/// match the CLI's `schedule` vocabulary exactly, since `TaskForm` passes
/// them straight through to `scheduleTask` unchanged.
export type ScheduleState =
  | "inbox"
  | "today"
  | "evening"
  | "keep"
  | "tomorrow"
  | "weekend"
  | "next-week"
  | "next-weekend"
  | "next-month";

/// The dropdown's value for a task's current schedule — the single source of
/// truth for both the form's initial `when` and, at submit time, whether the
/// dropdown actually moved.
///
/// `now` is a parameter (defaulting to `new Date()`) rather than read
/// internally, so "is this today" can be asserted against a fixed date in
/// tests instead of racing the clock.
export function scheduleOf(
  task: RitualTask,
  now: Date = new Date(),
): ScheduleState {
  if (task.evening) return "evening";
  if (!task.scheduled) return "inbox";
  return task.scheduled === formatDay(now) ? "today" : "keep";
}

/// The Task form's title and notes are one `Form.TextArea` (Raycast forms
/// have no rich text, so a separate larger-font title field isn't possible):
/// the first line is the title, everything after the first newline is notes.
/// `\r\n` is normalised to `\n` first — a pasted note is a realistic source
/// of Windows line endings, and leaving them in would make the "first
/// newline" split inconsistent with what the user sees as one line break.
export function splitComposedText(text: string): {
  title: string;
  notes: string;
} {
  const normalized = text.replace(/\r\n/g, "\n");
  const separator = normalized.indexOf("\n");
  if (separator === -1) return { title: normalized.trim(), notes: "" };
  return {
    title: normalized.slice(0, separator).trim(),
    notes: normalized.slice(separator + 1),
  };
}

/// The inverse of `splitComposedText`, for seeding the field from a loaded
/// task. No notes (empty or absent) yields just the title — no trailing
/// newline — so an unedited task round-trips to exactly the text it started
/// as instead of picking up a blank second line.
export function joinComposedText(
  title: string,
  notes: string | undefined,
): string {
  return notes ? `${title}\n${notes}` : title;
}

/// Only what actually differs. `when` is deliberately absent: scheduling is a
/// separate CLI command (`schedule`), sent as its own write by the caller,
/// not folded into `update`.
export function diff(
  task: RitualTask,
  next: {
    title: string;
    notes: string;
    deadline: string | null;
    project: string | null;
    tags: string[];
  },
): TaskEdits {
  const edits: TaskEdits = {};
  if (next.title !== task.title) edits.title = next.title;
  if (next.notes !== (task.notes ?? "")) edits.notes = next.notes;
  if (next.deadline !== (task.deadline ?? null)) edits.deadline = next.deadline;
  if (next.project !== (task.project ?? null)) edits.project = next.project;

  const before = new Set(task.tags ?? []);
  const after = new Set(next.tags);
  const added = next.tags.filter((tag) => !before.has(tag));
  const removed = (task.tags ?? []).filter((tag) => !after.has(tag));
  if (added.length) edits.addTags = added;
  if (removed.length) edits.removeTags = removed;
  return edits;
}
