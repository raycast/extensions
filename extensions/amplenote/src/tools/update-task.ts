import { Tool } from "@raycast/api";
import { amplenote } from "../lib/amplenote";
import { taskTitle } from "../lib/tasks";
import { Task } from "../lib/api";
import { HideRule, reanchorRepeat } from "../lib/repeat";
import { describeError, parseDate, planSchedule, requireTask, scheduleInfo } from "./shared";

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
  /**
   * Optional fixed repeat schedule as an RRULE, e.g. FREQ=DAILY, FREQ=WEEKLY;BYDAY=MO, FREQ=WEEKLY;INTERVAL=2;BYDAY=FR,
   * FREQ=MONTHLY;BYMONTHDAY=1, or FREQ=YEARLY. Uses startDate, or the task's existing start, as the first occurrence and the time of day.
   * Repeating a set time after completion ("2 days after I finish") is not possible.
   */
  repeat?: string;
  /**
   * Optional: hide the task until shortly before it starts. Uses startDate or the existing start; not allowed together with repeat.
   * "day-due" hides it until the start day, the others until that long before.
   */
  hideUntil?: HideRule;
};

/** Repeat and hide-until changes, anchored at the given or existing start. */
function scheduleUpdates(input: Input, task: Task) {
  // A repeating task whose start moves keeps its rule but needs the new start as the rule's anchor.
  if (!input.repeat && !input.hideUntil) {
    if (!input.startDate || !task.isRepeating || !task.repeat) return {};
    const startAt = parseDate(input.startDate);
    return { startAt, repeat: reanchorRepeat(task.repeat, new Date(startAt * 1000)) };
  }
  if (input.startDate === "") {
    throw new Error("Can't clear the start date while setting repeat or hideUntil: both need a start date.");
  }
  if (input.hideUntil && task.isRepeating) {
    throw new Error(
      "hideUntil can't be used on a repeating task: Amplenote's MCP would only hide the first occurrence.",
    );
  }
  if (!input.startDate && !task.startAt) {
    throw new Error("This task has no start date, which it needs to repeat or to be hidden until. Pass startDate too.");
  }
  const plan = planSchedule(input, task.startAt);
  return {
    ...(plan.startChanged && plan.startAt ? { startAt: plan.startAt } : {}),
    ...(plan.repeat ? { isRepeating: true, repeat: plan.repeat } : {}),
    ...(plan.hideUntil ? { hideUntil: plan.hideUntil } : {}),
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const task = await requireTask(input.taskUUID);
  return {
    info: [
      { name: "Task", value: taskTitle(task.content) },
      ...(input.important !== undefined ? [{ name: "Important", value: input.important ? "Yes" : "No" }] : []),
      ...(input.urgent !== undefined ? [{ name: "Urgent", value: input.urgent ? "Yes" : "No" }] : []),
      ...(input.startDate === "" ? [{ name: "Start", value: "(unscheduled)" }] : []),
      ...(input.deadline !== undefined ? [{ name: "Deadline", value: input.deadline || "(removed)" }] : []),
      ...scheduleInfo({ ...input, startDate: input.startDate || undefined }, task.startAt),
    ],
  };
};

/**
 * Change an Amplenote task's important or urgent flag, start date, deadline, repeat schedule, or hide-until.
 */
export default async function (input: Input) {
  try {
    const task = await requireTask(input.taskUUID);
    const updates = {
      ...(input.important !== undefined ? { important: input.important } : {}),
      ...(input.urgent !== undefined ? { urgent: input.urgent } : {}),
      ...(input.startDate !== undefined && !input.repeat && !input.hideUntil
        ? { startAt: input.startDate ? parseDate(input.startDate) : null }
        : {}),
      ...(input.deadline !== undefined ? { deadline: input.deadline ? parseDate(input.deadline) : null } : {}),
      ...scheduleUpdates(input, task),
    };
    if (Object.keys(updates).length === 0) {
      throw new Error("Provide at least one of important, urgent, startDate, deadline, repeat, or hideUntil.");
    }
    await amplenote.updateTask(task.uuid, updates);
    return { taskUUID: task.uuid, title: taskTitle(task.content), updated: Object.keys(updates) };
  } catch (error) {
    describeError(error);
  }
}
