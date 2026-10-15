import { useCachedPromise } from "@raycast/utils";
import { useMemo, useRef } from "react";

import { loadReadPage, loadUnreadExtras, unreadPreviewInputs, type ReadCursor } from "../api/home";
import type { UnreadSpace } from "../api/unread";
import { showChatError } from "../helpers/feedback";

/**
 * Read conversations for My Messages, most recently active first, 25 per page via the List `pagination` prop.
 * Only runs when `execute` is true (the All view, once the unread result is known).
 */
export function useReadConversations(execute: boolean, unreadSpaceNames: string[]) {
  // Read through a ref so marking a conversation read doesn't reload every page; the next refresh picks it up.
  const unreadRef = useRef(unreadSpaceNames);
  unreadRef.current = unreadSpaceNames;
  const result = useCachedPromise(
    () =>
      ({ page, cursor }: { page: number; cursor?: ReadCursor }) =>
        loadReadPage(page, cursor, new Set(unreadRef.current)),
    [],
    {
      execute,
      keepPreviousData: true,
      onError: (error) => showChatError(error, () => result.revalidate()),
    },
  );
  return result;
}

/** Preview names and "You replied" for the Unread section. Failures only cost those details. */
export function useUnreadExtras(entries: UnreadSpace[]) {
  const inputs = useMemo(() => unreadPreviewInputs(entries), [entries]);
  const { data } = useCachedPromise(loadUnreadExtras, [inputs], {
    keepPreviousData: true,
    onError: (error) => console.error("Could not load unread details", error),
  });
  return data ?? { names: {}, replied: [] };
}
