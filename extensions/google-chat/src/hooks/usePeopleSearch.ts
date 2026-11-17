import { useCachedPromise } from "@raycast/utils";

import { searchDirectory } from "../api/people";
import { showChatError } from "../helpers/feedback";

/** Directory people matching `query` (prefix match on names and emails). */
export function usePeopleSearch(query: string) {
  return useCachedPromise(searchDirectory, [query], {
    keepPreviousData: true,
    execute: query.trim().length > 0,
    onError: (error) => showChatError(error),
  });
}
