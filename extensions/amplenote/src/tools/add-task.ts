import { Tool } from "@raycast/api";
import { describeError, parseDate, resolveTargetNote } from "./shared";
import { isInTaskDomain } from "../lib/api";
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
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  info: [
    { name: "Task", value: input.content.trim() },
    { name: "Note", value: input.noteName?.trim() || "Today's Daily Jot" },
    ...(input.startDate ? [{ name: "Start", value: input.startDate }] : []),
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
    const startAt = input.startDate ? parseDate(input.startDate) : null;
    const deadline = input.deadline ? parseDate(input.deadline) : null;
    const [note, domains] = await Promise.all([resolveTargetNote(input.noteName), amplenote.getTaskDomains()]);
    const taskUUID = await amplenote.insertTask(note.uuid, {
      content,
      startAt,
      deadline,
      important: input.important ?? false,
      urgent: input.urgent ?? false,
    });
    return {
      taskUUID,
      noteUUID: note.uuid,
      noteName: note.name,
      content,
      inTaskDomain: isInTaskDomain(domains, note.uuid),
    };
  } catch (error) {
    describeError(error);
  }
}
