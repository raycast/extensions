import type { Worktree } from "#/config/types";
import { getRepoWorktrees } from "#/helpers/file";
import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";

export const useWorktrees = (projectPath: string) => {
  const abortable = useRef<AbortController | undefined>(undefined);

  const { data, isLoading, revalidate } = useCachedPromise(
    (path) => getRepoWorktrees(path, { signal: abortable.current?.signal }),
    [projectPath],
    {
      initialData: [],
      keepPreviousData: true,
      abortable,
    },
  );

  return {
    worktrees: data as Worktree[],
    isLoadingWorktrees: isLoading,
    revalidateWorktrees: revalidate,
  };
};
