import { useCachedPromise } from "@raycast/utils";

import { useWorkspaces } from "../components/WorkspaceContext";
import { getInitiatives } from "../tools/get-initiatives";

export function useInitiatives() {
  const { workspaceKey } = useWorkspaces();
  const { data, error, isLoading, mutate } = useCachedPromise(
    (key: string) => {
      void key;
      return getInitiatives();
    },
    [workspaceKey],
    {
      failureToastOptions: { title: "Failed to load initiatives" },
      keepPreviousData: true,
    },
  );

  return {
    initiatives: data,
    initiativesError: error,
    isLoadingInitiatives: (!data && !error) || isLoading,
    mutateInitiatives: mutate,
  };
}
