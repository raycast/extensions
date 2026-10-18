import { Tool } from "@raycast/api";
import { amplenote } from "../lib/amplenote";
import { taskTitle } from "../lib/tasks";
import { describeError, parseDate, requireTask } from "./shared";

type Input = {
  /**
   * The taskUUID from search-tasks. Never invent an id.
   */
  taskUUID: string;
  /**
   * Set or clear the important flag. Omit to leave it unchanged.
   */
  important?: boolean;
  /**
   * Set or clear the urgent flag. Omit to leave it unchanged.
   */
  urgent?: boolean;
  /**
   * New start date as YYYY-MM-DD (scheduled at 9:00) or an ISO date-time. Pass an empty string to unschedule. Omit to leave it unchanged.
   */
  startDate?: string;
  /**
   * New deadline as YYYY-MM-DD (due at 9:00) or an ISO date-time. Pass an empty string to remove it. Omit to leave it unchanged.
   * A task is overdue when its deadline has passed, so move the deadline when rescheduling an overdue task.
   */
  deadline?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const task = await requireTask(input.taskUUID);
  return {
    info: [
      { name: "Task", value: taskTitle(task.content) },
      ...(input.important !== undefined ? [{ name: "Important", value: input.important ? "Yes" : "No" }] : []),
      ...(input.urgent !== undefined ? [{ name: "Urgent", value: input.urgent ? "Yes" : "No" }] : []),
      ...(input.startDate !== undefined ? [{ name: "Start", value: input.startDate || "(unscheduled)" }] : []),
      ...(input.deadline !== undefined ? [{ name: "Deadline", value: input.deadline || "(removed)" }] : []),
    ],
  };
};

/**
 * Change an Amplenote task's important or urgent flag, start date, or deadline.
 */
export default async function (input: Input) {
  try {
    const task = await requireTask(input.taskUUID);
    const updates = {
      ...(input.important !== undefined ? { important: input.important } : {}),
      ...(input.urgent !== undefined ? { urgent: input.urgent } : {}),
      ...(input.startDate !== undefined ? { startAt: input.startDate ? parseDate(input.startDate) : null } : {}),
      ...(input.deadline !== undefined ? { deadline: input.deadline ? parseDate(input.deadline) : null } : {}),
    };
    if (Object.keys(updates).length === 0) {
      throw new Error("Provide at least one of important, urgent, startDate, or deadline.");
    }
    await amplenote.updateTask(task.uuid, updates);
    return { taskUUID: task.uuid, title: taskTitle(task.content), updated: Object.keys(updates) };
  } catch (error) {
    describeError(error);
  }
}
