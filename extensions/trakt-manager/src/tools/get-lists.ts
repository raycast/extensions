import { CompactList, CompactListEntry, toCompactList, toCompactListEntry } from "./compact-media";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * Name or partial name of a list to look up (e.g. "Oscars").
   * Omit to get every personal list.
   */
  query?: string;
  /**
   * Trakt ID or slug of a list whose items should be returned.
   */
  listId?: string;
  /**
   * Set to true to also return the items contained in the matched list.
   * Only applies when exactly one list matches.
   */
  includeItems?: boolean;
  /**
   * Maximum number of items to return when `includeItems` is true (default: 50, max: 100).
   */
  itemLimit?: number;
};

type Output = {
  found: boolean;
  message: string;
  lists: CompactList[];
  /**
   * Items of the matched list, when requested.
   */
  items?: CompactListEntry[];
  totalItems?: number;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Get the personal lists on your Trakt account, and optionally the items inside one of them.
 * Use this before `add-to-list` to find the `listId` of an existing list.
 */
export default async function tool(input: Input): Promise<Output> {
  const { query, listId, includeItems = false, itemLimit = 50 } = input;
  const safeItemLimit = Math.min(Math.max(itemLimit, 1), 100);

  const res = await executeToolCall(
    (signal) =>
      toolTraktClient.users.getLists({
        params: { id: "me" },
        fetchOptions: { signal },
      }),
    "Failed to fetch your Trakt personal lists",
  );

  const allLists = res.body.map(toCompactList);
  let lists = allLists;

  if (listId) {
    const target = String(listId);
    lists = allLists.filter((list) => String(list.traktId) === target || list.slug === target);
  } else if (query) {
    const normalizedQuery = normalize(query);
    const exact = allLists.filter((list) => normalize(list.name) === normalizedQuery);
    lists = exact.length > 0 ? exact : allLists.filter((list) => normalize(list.name).includes(normalizedQuery));
  }

  const found = lists.length > 0;

  if (!found) {
    const target = query ? `"${query}"` : listId ? `list ${listId}` : "any list";
    return {
      found: false,
      message: `No personal list matching ${target}. You currently have ${allLists.length} list(s): ${
        allLists.map((list) => list.name).join(", ") || "none"
      }.`,
      lists: allLists,
    };
  }

  if (includeItems && lists.length === 1) {
    const target = lists[0];
    const itemsRes = await executeToolCall(
      (signal) =>
        toolTraktClient.users.getListItems({
          params: { id: "me", listId: target.slug ?? String(target.traktId) },
          fetchOptions: { signal },
        }),
      `Failed to fetch items of list "${target.name}"`,
    );

    const items = itemsRes.body.map(toCompactListEntry);

    return {
      found: true,
      message: `List "${target.name}" contains ${items.length} item(s).`,
      lists,
      items: items.slice(0, safeItemLimit),
      totalItems: items.length,
    };
  }

  return {
    found: true,
    message: `Found ${lists.length} matching list(s).`,
    lists,
  };
}
