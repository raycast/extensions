import { Tool } from "@raycast/api";
import { ApiError } from "../api";
import { NotSignedInError, taskit } from "../auth";
import { createTask, type Task } from "../tasks";
import type { TaskitApi } from "../api";

type Input = {
  /**
   * Task sentence, for example "Buy milk tomorrow !!".
   */
  text: string;
  /**
   * List name or id. Omit to use the inbox.
   */
  list?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Create "${input.text.trim()}"?`,
    info: input.list ? [{ name: "List", value: input.list }] : undefined,
  };
};

/**
 * Create a task from a sentence. The Taskit API parses dates, priority, and tags, then saves the task.
 */
export default async function tool(input: Input): Promise<string> {
  const task = await run((api) => createTask(api, input));
  return `Created "${task.title}" (${task.id})`;
}

export async function run<T>(work: (api: TaskitApi) => Promise<T>): Promise<T> {
  try {
    return await work(await taskit());
  } catch (error) {
    if (error instanceof NotSignedInError) {
      throw new Error("Sign in to Taskit from the My Tasks command.");
    }
    if (error instanceof ApiError) throw new Error(error.message);
    throw error;
  }
}

export function describe(task: Task): string {
  const bits = [`${task.title} (${task.id})`];
  if (task.status) bits.push(task.status);
  if (task.priority && task.priority !== "none") bits.push(task.priority);
  if (task.dueAt) bits.push(`due ${task.dueAt}`);
  if (task.startAt) bits.push(`starts ${task.startAt}`);
  return bits.join(" · ");
}
