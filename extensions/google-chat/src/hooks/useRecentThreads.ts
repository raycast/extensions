import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";

import { listMessages } from "../api/chat";
import { loadUserNames } from "../api/spaces";
import type { Space } from "../api/types";
import { spaceNameOf } from "../helpers/recipient";
import { buildThreadOptions, threadMode } from "../helpers/threads";

/** Messages read to find recent threads (one `spaces.messages.list` page, newest first). */
const MESSAGES_TO_SCAN = 100;

async function recentMessages(spaceName: string) {
  const page = await listMessages(spaceName, { pageSize: MESSAGES_TO_SCAN });
  return page.messages ?? [];
}

/**
 * About 20 recent threads in `space`, newest first, for the Send Message form's Thread dropdown.
 * Nothing loads until a space is chosen, or for spaces without threads. Failures leave the list empty.
 */
export function useRecentThreads(space: Space | undefined) {
  const mode = space ? threadMode(space) : "none";
  const enabled = !!space && mode !== "none";
  const messages = useCachedPromise(recentMessages, [space?.name ?? ""], {
    execute: enabled,
    onError: (error) => console.error("Could not load recent threads", error),
  });
  const names = useCachedPromise(loadUserNames, [space ?? { name: "" }], {
    execute: enabled,
    keepPreviousData: true,
    onError: (error) => console.error("Could not load member names", error),
  });

  const threads = useMemo(() => {
    if (!enabled || !space) return [];
    // Cached data can briefly belong to the previously chosen space.
    const inSpace = (messages.data ?? []).filter((m) => spaceNameOf(m.name) === space.name);
    return buildThreadOptions(inSpace, { mode, names: names.data ?? {} });
  }, [enabled, space?.name, mode, messages.data, names.data]);

  return { threads, isLoading: enabled && messages.isLoading, revalidate: messages.revalidate };
}
