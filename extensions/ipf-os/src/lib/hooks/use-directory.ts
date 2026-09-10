import { useCachedPromise } from "@raycast/utils";

import { createLookup, getDirectory, type DirectoryLookup } from "../api/directory";

export function useDirectory(options?: { execute?: boolean }): { lookup: DirectoryLookup; isLoading: boolean } {
  const { data, isLoading } = useCachedPromise(getDirectory, [], {
    execute: options?.execute ?? true,
    keepPreviousData: true,
  });

  return { lookup: createLookup(data), isLoading };
}
