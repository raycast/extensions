import { useCachedPromise } from "@raycast/utils";

import { Instance } from "../api/types";
import { resolveSelected } from "../instances/records";
import { getSelectedInstanceId, listInstances, setSelectedInstanceId } from "../instances/storage";

export interface UseInstances {
  instances: Instance[];
  /** The instance commands should query. Undefined only when none are configured. */
  active: Instance | undefined;
  isLoading: boolean;
  selectInstance: (id: string) => Promise<void>;
  revalidate: () => void;
}

/** The selection is global, so switching instance in one command switches it in all of them. */
export function useInstances(): UseInstances {
  const { data, isLoading, revalidate } = useCachedPromise(
    async () => {
      const [instances, selectedId] = await Promise.all([listInstances(), getSelectedInstanceId()]);
      return { instances, selectedId };
    },
    [],
    { initialData: { instances: [], selectedId: undefined } },
  );

  const instances = data?.instances ?? [];

  return {
    instances,
    active: resolveSelected(instances, data?.selectedId),
    isLoading,
    selectInstance: async (id: string) => {
      await setSelectedInstanceId(id);
      revalidate();
    },
    revalidate,
  };
}
