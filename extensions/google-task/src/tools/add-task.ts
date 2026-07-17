import * as google from "../api/oauth";
import { createTask, fetchLists } from "../api/endpoints";

type Input = {
  title: string;
  notes?: string;
  due?: string;
  listId?: string;
};

export default async function (input: Input) {
  await google.authorize();
  let listId = input.listId;
  if (!listId) {
    const lists = await fetchLists();
    if (lists.length === 0) throw new Error("No task lists found");
    listId = lists[0].id;
  }
  const date = input.due ? new Date(input.due) : undefined;
  await createTask(listId, { title: input.title, notes: input.notes, due: date || null });
  return `Task "${input.title}" created successfully.`;
}
