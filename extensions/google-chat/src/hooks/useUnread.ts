import { useCachedPromise } from "@raycast/utils";

import { getUnread } from "../api/unread";
import { showChatError } from "../helpers/feedback";

/** Searches afresh each time the view opens (and stores the result for Unread Chat and the AI tool). */
function loadFresh(lookbackDays: number) {
  return getUnread(lookbackDays, { maxAgeMs: 0 });
}

/** Unread messages from the last `lookbackDays` days, grouped by space, with totals. */
export function useUnread(lookbackDays: number) {
  const result = useCachedPromise(loadFresh, [lookbackDays], {
    keepPreviousData: true,
    onError: (error) => showChatError(error, () => result.revalidate()),
  });
  return result;
}
