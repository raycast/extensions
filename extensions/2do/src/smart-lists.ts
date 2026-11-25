import { Cache } from "@raycast/api";
import { SmartList, twoDo } from "./2do";

const cache = new Cache();
const KEY = "smart-list-catalog";
const MAX_AGE = 10 * 60_000;

export function invalidateSmartLists() {
  cache.remove(KEY);
}

// Cache only the dropdown catalog, never a smart list's tasks. Selecting a scope still queries
// 2Do fresh. Task actions force a catalog refresh in case they changed a smart list's availability.
export async function loadSmartLists(): Promise<SmartList[]> {
  const stored = cache.get(KEY);
  if (stored) {
    try {
      const { at, lists } = JSON.parse(stored);
      if (
        typeof at === "number" &&
        at <= Date.now() &&
        Date.now() - at < MAX_AGE &&
        Array.isArray(lists) &&
        lists.every(
          (l) =>
            l &&
            typeof l.smart_list_id === "string" &&
            typeof l.collection_id === "string" &&
            typeof l.title === "string",
        )
      )
        return lists;
    } catch {
      // A corrupt cache must not prevent opening View Tasks.
    }
  }
  const { smart_lists } = await twoDo<{ smart_lists: SmartList[] }>("list_smart_lists");
  cache.set(KEY, JSON.stringify({ at: Date.now(), lists: smart_lists }));
  return smart_lists;
}
