import { useCachedPromise } from "@raycast/utils";
import { getWorkspace } from "../api/workspace";
import { UseCachedPromiseOptions } from "../types/utils";

type Props = {
  options?: UseCachedPromiseOptions<typeof getWorkspace>;
};

export default function useWorkspaces({ options }: Props = {}) {
  const { data, error, isLoading, mutate } = useCachedPromise(getWorkspace, [], {
    ...options,
  });

  return {
    workspaceData: data,
    workspaceError: error,
    workspaceIsLoading: isLoading,
    workspaceMutate: mutate,
  };
}
