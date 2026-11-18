import { create } from "../lib/jovida";
import { toolPreflight } from "../lib/tool-helpers";
import { Priority, ReminderChannel } from "../lib/types";

type Input = {
  /** The todo title — a single line of plain text. Required. */
  title: string;
  /**
   * When the todo is due. A bare date "2026-06-25" means it belongs to that
   * day (no hard time); a datetime with offset "2026-06-25T18:00:00+08:00" is
   * a precise deadline. Omit if there is no date.
   */
  when?: string;
  /** Priority: none | low | medium | high. */
  priority?: Priority;
  /** A free-text grouping label, e.g. "work". */
  category?: string;
  /** Longer description, single line. */
  description?: string;
  /** Subtasks — each string becomes one step. */
  subtasks?: string[];
  /**
   * Reminder times as ISO datetimes with offset. Each must be at or before
   * `when`. A reminder/alarm ("闹钟", "remind me") is just when to nudge — it
   * does NOT make the todo repeat.
   */
  reminders?: string[];
  /** Reminder delivery channels. Use ["voice_call"] for phone call reminders. */
  reminderChannels?: ReminderChannel[];
  /** Convenience flag: set true to make the reminder a phone call reminder. */
  phoneReminder?: boolean;
};

/**
 * Create a single, ONE-OFF Jovida todo. Applies immediately and syncs to the
 * user's devices. This tool CANNOT create repeating todos — use it for every
 * normal task, including ones with a date, a deadline, or a reminder/alarm
 * ("tonight", "tomorrow 3pm", "remind me at 9"). For a genuinely recurring
 * routine the user explicitly asks to repeat ("every day", "每周一"), use the
 * create-recurring-todo tool instead.
 *
 * Returns the new entry_id.
 */
export default async function tool(input: Input) {
  const blocked = await toolPreflight();
  if (blocked) return blocked;
  // Note: no repeat params are accepted here — this tool only makes one-off todos.
  return create({
    title: input.title,
    when: input.when,
    priority: input.priority,
    category: input.category,
    description: input.description,
    subtasks: input.subtasks,
    reminders: input.reminders,
    reminderChannels: input.reminderChannels,
    phoneReminder: input.phoneReminder,
  });
}
