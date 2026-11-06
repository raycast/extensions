import { useCachedPromise } from "@raycast/utils";
import { fetchClaudeUsageLimits } from "../utils/claude-api-client";

const loadClaudeUsageLimits = async () => {
  const result = await fetchClaudeUsageLimits();
  if (result.status === "error") throw new Error(result.message);
  return result.data;
};

// The menu bar shows the error as an item, so a background refresh needs no toast too.
export const useClaudeUsageLimits = () => useCachedPromise(loadClaudeUsageLimits, [], { onError: () => undefined });
