import { Tool } from "@raycast/api";
import { updateTask, type Priority } from "../tasks";
import { describe, run } from "./create-task";

type Input = {
  /**
   * Task id.
   */
  id: string;
  /**
   * New title.
   */
  title?: string;
  /**
   * List name or id.
   */
  list?: string;
  /**
   * Schedule, ISO-8601 with a timezone offset. An empty string clears it.
   */
  startAt?: string;
  /**
   * Deadline, ISO-8601 with a timezone offset. An empty string clears it.
   */
  dueAt?: string;
  /**
   * none, low, medium, high, or urgent.
   */
  priority?: Priority;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const info = [
    input.title ? { name: "Title", value: input.title } : undefined,
    input.list ? { name: "List", value: input.list } : undefined,
    input.priority ? { name: "Priority", value: input.priority } : undefined,
    input.startAt !== undefined
      ? { name: "Starts", value: input.startAt.trim() || "cleared" }
      : undefined,
    input.dueAt !== undefined
      ? { name: "Due", value: input.dueAt.trim() || "cleared" }
      : undefined,
  ].filter(
    (item): item is { name: string; value: string } => item !== undefined,
  );
  return { message: `Update task ${input.id}?`, info };
};

/**
 * Change a task's title, list, schedule (startAt), deadline (dueAt), or priority.
 * Dates must be ISO-8601 with a timezone offset. Pass an empty string to clear a date.
 */
export default async function tool(input: Input): Promise<string> {
  const task = await run((api) =>
    updateTask(api, {
      ...input,
      startAt: clearedDate(input.startAt),
      dueAt: clearedDate(input.dueAt),
    }),
  );
  return `Updated ${describe(task)}`;
}

function clearedDate(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
