import { useCachedPromise } from "@raycast/utils";
import { fetchRepositories } from "./github";

export function useRepositories(searchQuery: string | undefined) {
  return useCachedPromise(fetchRepositories, [searchQuery]);
}
