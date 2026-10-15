import { PaginationOptions, useCachedPromise } from "@raycast/utils";
import { getIntakeItems } from "../api/intake";
import { RawIntakeItem } from "../api/types";
import { errorShownInline } from "../helpers/errors";

export function useIntakeItems(projectId: string | undefined, config: { execute?: boolean } = {}) {
  return useCachedPromise(
    (projectId: string) => async (pagination: PaginationOptions<RawIntakeItem[]>) =>
      getIntakeItems({ projectId, cursor: pagination.cursor }),
    [projectId ?? ""],
    { keepPreviousData: true, onError: errorShownInline, execute: config.execute !== false && !!projectId },
  );
}
