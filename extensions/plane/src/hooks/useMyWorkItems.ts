import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { getMyWorkItems, readSharedResult } from "../api/my-work-items";
import { planeClient } from "../api/auth";
import type { MyWorkItemsView } from "../helpers/work-item-backends";
import { errorShownInline } from "../helpers/errors";

/**
 * Shared by the My Work Items command and the menu bar, so both use the same cache entry per view.
 * The AI tool reads the same result through `getMyWorkItems(view, { maxAgeMs })`, and a result it fetched
 * seeds this hook when the hook has nothing cached yet.
 */
export function useMyWorkItems(
  view: MyWorkItemsView = "assigned",
  config: {
    execute?: boolean;
    /** Reuse a shared result younger than this instead of fetching. */ maxAgeMs?: number;
  } = {},
) {
  const workspaceSlug = planeClient?.workspaceSlug;
  const initialData = useMemo(() => (workspaceSlug ? readSharedResult(view) : undefined), [view, workspaceSlug]);
  return useCachedPromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the slug only scopes the cache key
    (view: MyWorkItemsView, _workspaceSlug?: string) => getMyWorkItems(view, { maxAgeMs: config.maxAgeMs }),
    [view, workspaceSlug],
    {
      initialData,
      keepPreviousData: true,
      onError: errorShownInline,
      execute: config.execute !== false && !!planeClient,
    },
  );
}
