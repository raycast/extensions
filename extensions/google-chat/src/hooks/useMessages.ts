import { useCachedPromise } from "@raycast/utils";

import { listMessages } from "../api/chat";
import { showChatError } from "../helpers/feedback";

/** Messages in a space, newest first, 25 per page via the List `pagination` prop. */
export function useMessages(spaceName: string) {
  const result = useCachedPromise(
    (name: string) =>
      async ({ cursor }: { page: number; cursor?: string }) => {
        const page = await listMessages(name, { pageSize: 25, pageToken: cursor });
        return { data: page.messages ?? [], hasMore: !!page.nextPageToken, cursor: page.nextPageToken };
      },
    [spaceName],
    { keepPreviousData: true, onError: (error) => showChatError(error, () => result.revalidate()) },
  );
  return result;
}
