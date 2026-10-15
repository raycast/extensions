import { useCachedPromise } from "@raycast/utils";
import { getPages } from "../api/pages";
import { planeClient } from "../api/auth";
import { errorShownInline } from "../helpers/errors";

export function usePages(projectId: string | undefined, config: { execute?: boolean } = {}) {
  return useCachedPromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the slug only scopes the cache key
    (projectId: string, _workspaceSlug?: string) => getPages({ projectId: projectId || undefined }),
    [projectId ?? "", planeClient?.workspaceSlug],
    { keepPreviousData: true, onError: errorShownInline, execute: config.execute !== false },
  );
}
