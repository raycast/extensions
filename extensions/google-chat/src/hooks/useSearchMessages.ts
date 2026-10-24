import { useCachedPromise } from "@raycast/utils";

import { searchMessages } from "../api/chat";
import { showChatError } from "../helpers/feedback";
import { searchPageFilter, type SearchCursor, type SearchMode } from "../helpers/search";

/** `spaces.messages.search` results, 25 per page, newest first. Every page of a search sends the same filter. */
export function useSearchMessages(query: string, mode: SearchMode) {
  const result = useCachedPromise(
    (text: string, filterMode: SearchMode) =>
      async ({ cursor }: { page: number; cursor?: SearchCursor }) => {
        const filter = searchPageFilter(text, filterMode, cursor);
        const response = await searchMessages({ filter, pageSize: 25, pageToken: cursor?.pageToken });
        const messages = (response.results ?? []).flatMap((r) => (r.message ? [r.message] : []));
        const next: SearchCursor | undefined = response.nextPageToken
          ? { filter, pageToken: response.nextPageToken }
          : undefined;
        return { data: messages, hasMore: !!next, cursor: next };
      },
    [query, mode],
    { keepPreviousData: true, onError: (error) => showChatError(error, () => result.revalidate()) },
  );
  return result;
}
