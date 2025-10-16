import { LocalStorage } from "@raycast/api";
import type { Snippet } from "../types";

const getKey = function (snippet: Snippet) {
  return snippet.id;
};

const getLastCopiedMap = async function (): Promise<{ [key: string]: number }> {
  const map: string = (await LocalStorage.getItem("lastCopiedMap")) ?? "{}";
  return JSON.parse(map);
};

const setLastCopiedMap = async function (lastCopiedMap: { [key: string]: number }) {
  await LocalStorage.setItem("lastCopiedMap", JSON.stringify(lastCopiedMap));
};

const storeLastCopied = async function (snippet: Snippet) {
  const lastCopiedMap = await getLastCopiedMap();

  const itemKey = getKey(snippet);
  const itemValue = Date.now();
  lastCopiedMap[itemKey] = itemValue;
  setLastCopiedMap(lastCopiedMap);
};

const clearUnusedSnippets = async function (snippets: Snippet[]) {
  const lastCopiedMap = await getLastCopiedMap();

  const snippetKeys = new Map(snippets.map((i) => [getKey(i), 1]));
  const toDelete = Object.keys(lastCopiedMap).filter((i) => !snippetKeys.get(i));

  toDelete.map((i) => delete lastCopiedMap[i]);
  setLastCopiedMap(lastCopiedMap);
};

const orderSnippets = async function (snippets: Snippet[]) {
  if (!snippets) {
    return snippets;
  }

  const orderMap = await getLastCopiedMap();
  snippets.sort(function (a: Snippet, b: Snippet) {
    const orderA = orderMap[getKey(a)] || 0;
    const orderB = orderMap[getKey(b)] || 0;
    return orderB - orderA;
  });
  return snippets;
};

export { storeLastCopied, getLastCopiedMap, clearUnusedSnippets, orderSnippets };
