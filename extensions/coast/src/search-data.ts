import { searchCaptures, type SearchArgs } from "./coast";
import { formatLocalDateTime } from "./dates";

export async function loadSearchResults(input: SearchArgs, visible: number) {
  if (
    !Number.isSafeInteger(visible) ||
    visible < 1 ||
    !Number.isSafeInteger(visible + 1)
  )
    throw new Error("Search result count must be a positive safe integer.");
  const scope = {
    ...input,
    tr: input.tr || `before:${formatLocalDateTime(new Date())}`,
  };
  const prefix = await searchCaptures({ ...scope, limit: visible + 1 });
  return {
    scope,
    // Replace the loaded prefix on expansion, rather than append from a drifting live index.
    results: prefix.slice(0, visible),
    hasMore: prefix.length > visible,
  };
}
