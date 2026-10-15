import { useCachedPromise } from "@raycast/utils";
import { getPages } from "../api/pages";
import { planeClient } from "../api/auth";
import { errorShownInline } from "../helpers/errors";
import { tagWithProject } from "../helpers/project-scoped";

export function usePages(projectId: string | undefined, config: { execute?: boolean } = {}) {
  return useCachedPromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the slug only scopes the cache key
    async (projectId: string, _workspaceSlug?: string) =>
      tagWithProject(await getPages({ projectId: projectId || undefined }), projectId),
    [projectId ?? "", planeClient?.workspaceSlug],
    { keepPreviousData: true, onError: errorShownInline, execute: config.execute !== false },
  );
}
