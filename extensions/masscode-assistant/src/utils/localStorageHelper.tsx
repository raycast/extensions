import { LocalStorage } from "@raycast/api";
import type { Snippet } from "../types";

const getKey = function (snippet: Snippet) {
  const snippet_id = snippet.id;
  return "LastCopied." + snippet_id;
};

const storeLastCopied = async function (snippet: Snippet) {
  const itemKey = getKey(snippet);
  await LocalStorage.setItem(itemKey, Date.now());
};

const getLastCopiedMap = async function () {
  return await LocalStorage.allItems();
};

const clearUnusedSnippets = async function (snippets: Snippet[], lastUsedMap: { [key: string]: number }) {
  const snippetKeys = new Map(snippets.map((i) => [getKey(i), 1]));
  const toDelete = Object.keys(lastUsedMap).filter((i) => !snippetKeys.get(i));

  await Promise.all(
    toDelete.map(async (i) => {
      await LocalStorage.removeItem(i);
    })
  );
};

const orderSnippets = function (
  snippets: Snippet[],
  orderMap: { [key: string]: number },
  preferences: { [key: string]: string }
) {
  if (!snippets) {
    return snippets;
  }

  if (!orderMap) {
    return snippets;
  }

  if (!preferences || !preferences["sort_order"]) {
    return snippets;
  }

  if (preferences["sort_order"] != "last_copied") {
    return snippets;
  }

  snippets.sort(function (a: Snippet, b: Snippet) {
    const orderA = orderMap[getKey(a)] || 0;
    const orderB = orderMap[getKey(b)] || 0;
    return orderB - orderA;
  });

  return snippets;
};

export { storeLastCopied, getLastCopiedMap, clearUnusedSnippets, orderSnippets };
