import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { getMyWorkItems, readSharedResult } from "../api/my-work-items";
import { getCurrentAccessToken, planeClient } from "../api/auth";
import type { MyWorkItemsView } from "../helpers/work-item-backends";
import { errorShownInline } from "../helpers/errors";
import { accountKey } from "../helpers/keys";

/**
 * Shared by the My Work Items command and the menu bar, so both use the same cache entry per view.
 * The AI tool reads the same result through `getMyWorkItems(view, { maxAgeMs })`, and a result it fetched
 * seeds this hook when the hook has nothing cached yet. The cache key holds the workspace and the account,
 * so another account's items are never shown.
 */
export function useMyWorkItems(
  view: MyWorkItemsView = "assigned",
  config: {
    execute?: boolean;
    /** Reuse a shared result younger than this instead of fetching. */ maxAgeMs?: number;
  } = {},
) {
  const workspaceSlug = planeClient?.workspaceSlug;
  const token = getCurrentAccessToken();
  const account = useMemo(() => (token ? accountKey(token) : undefined), [token]);
  const initialData = useMemo(
    () => (workspaceSlug ? readSharedResult(view) : undefined),
    [view, workspaceSlug, account],
  );
  return useCachedPromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the slug and account only scope the cache key
    (view: MyWorkItemsView, _workspaceSlug?: string, _account?: string) =>
      getMyWorkItems(view, { maxAgeMs: config.maxAgeMs }),
    [view, workspaceSlug, account],
    {
      initialData,
      keepPreviousData: true,
      onError: errorShownInline,
      execute: config.execute !== false && !!planeClient,
    },
  );
}
