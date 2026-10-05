import { useCachedPromise } from "@raycast/utils";
import { colimaList } from "../utils/cli";
import type { ColimaInstance } from "../utils/types";

export function useColimaInstances() {
  return useCachedPromise(
    async (): Promise<ColimaInstance[]> => {
      return colimaList();
    },
    [],
    {
      keepPreviousData: true,
      initialData: [] as ColimaInstance[],
      failureToastOptions: {
        title: "Failed to list Colima instances",
        message: "Make sure Colima is installed",
      },
    },
  );
}
