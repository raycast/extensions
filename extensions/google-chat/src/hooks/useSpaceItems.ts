import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";

import { getCachedPeople } from "../api/people";
import { listSpacesSorted, resolveSpaceItems } from "../api/spaces";
import type { SpaceItem } from "../api/types";
import { buildSpaceItem } from "../helpers/dm-names";
import { showChatError } from "../helpers/feedback";

/**
 * Spaces, group chats and DMs, most recently active first. The list shows as soon as `spaces.list`
 * returns; DM and group chat titles fill in once members are resolved (cached between runs).
 */
export function useSpaceItems() {
  const spaces = useCachedPromise(listSpacesSorted, [], {
    keepPreviousData: true,
    onError: (error) => showChatError(error, () => spaces.revalidate()),
  });
  const titled = useCachedPromise(resolveSpaceItems, [spaces.data ?? []], {
    execute: !!spaces.data && spaces.data.length > 0,
    keepPreviousData: true,
    onError: (error) => showChatError(error),
  });

  const items = useMemo<SpaceItem[]>(() => {
    const list = spaces.data ?? [];
    const resolved = new Map((titled.data ?? []).map((item) => [item.space.name, item]));
    const people = getCachedPeople();
    // Prefer resolved titles, but always show the latest space data (lastActiveTime etc.).
    return list.map((space) => {
      const item = resolved.get(space.name);
      return item ? { ...item, space } : buildSpaceItem(space, undefined, undefined, people);
    });
  }, [spaces.data, titled.data]);

  return {
    items,
    isLoading: spaces.isLoading || titled.isLoading,
    revalidate: spaces.revalidate,
  };
}
