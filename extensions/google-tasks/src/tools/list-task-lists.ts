import { loadLists } from "./shared";

/**
 * List Google Task lists with their ids and titles.
 */
export default async function () {
  const lists = await loadLists();
  return lists.map((list) => ({ id: list.id, title: list.title }));
}
