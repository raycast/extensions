import { withCache } from "@raycast/utils";
import { SmartList, twoDo } from "./2do";

export function invalidateSmartLists() {
  cachedSmartLists.clearCache();
}

// Cache only the dropdown catalog, never a smart list's tasks. Selecting a scope still queries
// 2Do fresh. Task actions force a catalog refresh in case they changed a smart list's availability.
const cachedSmartLists = withCache(
  async (): Promise<SmartList[]> => {
    const { smart_lists } = await twoDo<{ smart_lists: SmartList[] }>("list_smart_lists");
    return smart_lists;
  },
  {
    maxAge: 10 * 60_000,
    validate: (lists) =>
      Array.isArray(lists) &&
      lists.every(
        (l) =>
          l &&
          typeof l.smart_list_id === "string" &&
          typeof l.collection_id === "string" &&
          typeof l.title === "string",
      ),
  },
);

export async function loadSmartLists(): Promise<SmartList[]> {
  try {
    return await cachedSmartLists();
  } catch (error) {
    // withCache parses stored JSON before validation; recover if that JSON is corrupt.
    if (!(error instanceof SyntaxError || error instanceof TypeError)) throw error;
    invalidateSmartLists();
    return cachedSmartLists();
  }
}
