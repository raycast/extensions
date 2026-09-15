import { createTask, rememberLastChannel } from "../lib/sunsama-client";
import { todayString } from "../lib/date";

type Input = {
  /**
   * The task title. Optional when `url` is given — Sunsama then titles the
   * task from the linked item.
   */
  title?: string;
  /**
   * The day to add it to, as YYYY-MM-DD in the user's local timezone. Leave
   * empty for today.
   */
  day?: string;
  /** Notes for the task, in Markdown. */
  notes?: string;
  /**
   * The channel name to file it under. Use the exact name from get-channels.
   * Leave empty to let Sunsama pick (it does for linked items).
   */
  channel?: string;
  /** Planned time in whole minutes. */
  timeEstimate?: number;
  /** Subtask titles, in order. */
  subtasks?: string[];
  /**
   * A link to attach natively — Trello, GitHub, Todoist, ClickUp, Jira,
   * Linear, Asana, Notion, Gmail, Slack, or any web page.
   */
  url?: string;
  /** Where the task lands in the day. Defaults to the top. */
  position?: "top" | "bottom";
};

/**
 * Add a task to Sunsama.
 *
 * Give a title, a link, or both. A link becomes a proper linked task with the
 * provider's icon and a click-through to the original.
 */
export default async function tool(input: Input) {
  if (!input.title?.trim() && !input.url?.trim()) {
    throw new Error("Give a title or a url.");
  }

  const created = await createTask({
    title: input.title,
    day: input.day?.trim() || todayString(),
    notes: input.notes,
    channel: input.channel,
    timeEstimate: input.timeEstimate,
    subtasks: input.subtasks?.map((title) => ({ title })),
    url: input.url,
    position: input.position,
  });

  await rememberLastChannel(input.channel || created.channel || "");
  return {
    id: created.id,
    title: created.title,
    channel: input.channel || created.channel,
  };
}
