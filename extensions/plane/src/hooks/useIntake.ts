import { PaginationOptions, useCachedPromise } from "@raycast/utils";
import { getIntakeItems } from "../api/intake";
import { RawIntakeItem } from "../api/types";
import { errorShownInline } from "../helpers/errors";
import { FromProject, tagWithProject } from "../helpers/project-scoped";

export function useIntakeItems(projectId: string | undefined, config: { execute?: boolean } = {}) {
  return useCachedPromise(
    (projectId: string) => async (pagination: PaginationOptions<FromProject<RawIntakeItem>[]>) => {
      const page = await getIntakeItems({ projectId, cursor: pagination.cursor });
      return { ...page, data: tagWithProject(page.data, projectId) };
    },
    [projectId ?? ""],
    { keepPreviousData: true, onError: errorShownInline, execute: config.execute !== false && !!projectId },
  );
}
