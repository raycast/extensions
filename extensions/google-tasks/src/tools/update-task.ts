import { Tool } from "@raycast/api";
import { editTask } from "../api/endpoints";
import { parseDueDate, requireTask } from "./shared";

type Input = {
  /**
   * The task id from search-tasks. Never invent an id.
   */
  taskId: string;
  /**
   * The list id from search-tasks. Never invent a list id.
   */
  listId: string;
  /**
   * Replacement title. Omit to leave the current title unchanged.
   */
  title?: string;
  /**
   * Replacement notes. Omit to leave the current notes unchanged. Pass an empty string to clear notes.
   */
  notes?: string;
  /**
   * Replacement due date as YYYY-MM-DD. Omit to leave the current date unchanged. Pass empty to remove the date.
   */
  due?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const task = await requireTask(input.listId, input.taskId);
  return {
    info: [
      { name: "Task", value: task.title },
      { name: "List", value: task.listTitle },
      ...(input.title !== undefined ? [{ name: "New title", value: input.title }] : []),
      ...(input.notes !== undefined ? [{ name: "Notes", value: input.notes.slice(0, 300) || "(cleared)" }] : []),
      ...(input.due !== undefined ? [{ name: "Due", value: input.due || "(removed)" }] : []),
    ],
  };
};

/**
 * Update a Google task's title, notes, or due date.
 */
export default async function (input: Input) {
  if (input.title === undefined && input.notes === undefined && input.due === undefined) {
    throw new Error("Provide at least one field to update: title, notes, or due.");
  }
  const task = await requireTask(input.listId, input.taskId);
  const nextTitle = input.title !== undefined ? input.title.trim() : task.title;
  if (!nextTitle) {
    throw new Error("Title cannot be empty.");
  }
  await editTask(task.listId, {
    ...task,
    title: nextTitle,
    notes: input.notes !== undefined ? input.notes : task.notes,
    due: input.due === undefined ? task.due : input.due.trim() ? parseDueDate(input.due) : null,
  });
  return {
    id: task.id,
    listId: task.listId,
    listTitle: task.listTitle,
    title: nextTitle,
    due: input.due === undefined ? (task.due?.slice(0, 10) ?? null) : input.due.trim() || null,
  };
}
