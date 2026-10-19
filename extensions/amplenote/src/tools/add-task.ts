import { Tool } from "@raycast/api";
import { HideRule } from "../lib/repeat";
import { describeError, parseDate, planSchedule, resolveTargetNote, scheduleInfo, toIsoDate } from "./shared";
import { isInTaskDomain, isTemporaryId } from "../lib/api";
import { amplenote } from "../lib/amplenote";

type Input = {
  /**
   * The task text.
   */
  content: string;
  /**
   * Optional exact name of the note to add the task to. Omit it to use today's Daily Jot.
   */
  noteName?: string;
  /**
   * Optional start date as YYYY-MM-DD (scheduled at 9:00) or an ISO date-time. Resolve relative dates like "tomorrow" first.
   */
  startDate?: string;
  /**
   * Optional deadline as YYYY-MM-DD (due at 9:00) or an ISO date-time.
   */
  deadline?: string;
  /**
   * Mark the task important.
   */
  important?: boolean;
  /**
   * Mark the task urgent.
   */
  urgent?: boolean;
  /**
   * Optional fixed repeat schedule as an RRULE, e.g. FREQ=DAILY, FREQ=WEEKLY;BYDAY=MO, FREQ=WEEKLY;INTERVAL=2;BYDAY=FR,
   * FREQ=MONTHLY;BYMONTHDAY=1, or FREQ=YEARLY. Requires startDate, which sets the first occurrence and the time of day.
   * Repeating a set time after completion ("2 days after I finish") is not possible.
   */
  repeat?: string;
  /**
   * Optional: hide the task until shortly before it starts. Requires startDate; not allowed together with repeat.
   * "day-due" hides it until the start day, the others until that long before.
   */
  hideUntil?: HideRule;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  info: [
    { name: "Task", value: input.content.trim() },
    { name: "Note", value: input.noteName?.trim() || "Today's Daily Jot" },
    ...scheduleInfo(input),
    ...(input.deadline ? [{ name: "Deadline", value: input.deadline }] : []),
    ...(input.important || input.urgent
      ? [
          {
            name: "Priority",
            value: [input.important && "Important", input.urgent && "Urgent"].filter(Boolean).join(", "),
          },
        ]
      : []),
  ],
});

/**
 * Add a task to today's Amplenote Daily Jot, or to a named note.
 */
export default async function (input: Input) {
  try {
    const content = input.content.trim();
    if (!content) throw new Error("The task text is empty.");
    const schedule = planSchedule(input);
    const deadline = input.deadline ? parseDate(input.deadline) : null;
    const note = await resolveTargetNote(input.noteName);
    const taskUUID = await amplenote.insertTask(note.uuid, {
      content,
      startAt: schedule.startAt ?? null,
      deadline,
      repeat: schedule.repeat,
      hideUntil: schedule.hideUntil,
      important: input.important ?? false,
      urgent: input.urgent ?? false,
    });
    // The task is saved; checking task domains is best effort. null means "unknown": the domains couldn't be
    // loaded, or the note is so new (temporary id) that domain rules may not have picked it up yet.
    const domains = isTemporaryId(note.uuid) ? null : await amplenote.getTaskDomains().catch(() => null);
    return {
      taskUUID,
      noteUUID: note.uuid,
      noteName: note.name,
      content,
      startAt: toIsoDate(schedule.startAt),
      repeats: schedule.repeatText ?? null,
      inTaskDomain: domains ? isInTaskDomain(domains, note.uuid) : null,
    };
  } catch (error) {
    describeError(error);
  }
}
