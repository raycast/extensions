import { LocalStorage, Tool } from "@raycast/api";
import { createTask } from "../api/endpoints";
import { defaultListKey } from "../utils";
import { parseDueDate, resolveList } from "./shared";

type Input = {
  /**
   * Task title. Required.
   */
  title: string;
  /**
   * Optional notes / details.
   */
  notes?: string;
  /**
   * Optional due date as YYYY-MM-DD. Google Tasks stores a calendar date, not a time.
   */
  due?: string;
  /**
   * Optional list id from list-task-lists. Prefer this over listName when you have it.
   */
  listId?: string;
  /**
   * Optional list title if you do not have a list id.
   */
  listName?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const list = await resolveList(input.listId, input.listName);
  return {
    info: [
      { name: "Title", value: input.title.trim() },
      { name: "List", value: list.title },
      ...(input.due ? [{ name: "Due", value: input.due }] : []),
      ...(input.notes?.trim() ? [{ name: "Notes", value: input.notes.slice(0, 300) }] : []),
    ],
  };
};

/**
 * Create a Google task.
 */
export default async function (input: Input) {
  const title = input.title?.trim();
  if (!title) {
    throw new Error("Provide a title for the task.");
  }
  const list = await resolveList(input.listId, input.listName);
  await createTask(list.id, {
    title,
    notes: input.notes,
    due: input.due ? parseDueDate(input.due) : null,
  });
  if (!input.listId && !input.listName) {
    await LocalStorage.setItem(defaultListKey, list.id).catch(() => undefined);
  }
  return { title, listId: list.id, listTitle: list.title, due: input.due ?? null };
}
