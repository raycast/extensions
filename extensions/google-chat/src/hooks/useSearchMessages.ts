import { useCachedPromise } from "@raycast/utils";

import { searchMessages } from "../api/chat";
import { showChatError } from "../helpers/feedback";
import { buildSearchFilter, type SearchMode } from "../helpers/search";

/** `spaces.messages.search` results, 25 per page, newest first. */
export function useSearchMessages(query: string, mode: SearchMode) {
  const result = useCachedPromise(
    (text: string, filterMode: SearchMode) =>
      async ({ cursor }: { page: number; cursor?: string }) => {
        const response = await searchMessages({
          filter: buildSearchFilter(text, filterMode),
          pageSize: 25,
          pageToken: cursor,
        });
        const messages = (response.results ?? []).flatMap((r) => (r.message ? [r.message] : []));
        return { data: messages, hasMore: !!response.nextPageToken, cursor: response.nextPageToken };
      },
    [query, mode],
    { keepPreviousData: true, onError: (error) => showChatError(error, () => result.revalidate()) },
  );
  return result;
}
