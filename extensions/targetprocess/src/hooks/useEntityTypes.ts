import { useCachedPromise } from "@raycast/utils";

import { EntityTypeInfo, fetchEntityTypes } from "../api/entityTypes";
import { Instance } from "../api/types";

/** A failure is not surfaced: search still works, it just cannot offer the wider filter. */
export function useEntityTypes(instance: Instance | undefined): {
  catalogue: EntityTypeInfo[];
  isLoading: boolean;
} {
  const { data, isLoading } = useCachedPromise(
    async (instanceId: string | undefined) => {
      if (!instance || instance.id !== instanceId) return [] as EntityTypeInfo[];
      return fetchEntityTypes(instance);
    },
    [instance?.id],
    { initialData: [] as EntityTypeInfo[], keepPreviousData: true, failureToastOptions: { title: "" } },
  );

  return { catalogue: data ?? [], isLoading };
}
