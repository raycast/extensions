import { useCachedPromise } from "@raycast/utils";

import { createLookup, getDirectory, type DirectoryLookup } from "../api/directory";

export function useDirectory(): { lookup: DirectoryLookup; isLoading: boolean } {
  const { data, isLoading } = useCachedPromise(getDirectory, [], { keepPreviousData: true });

  return { lookup: createLookup(data), isLoading };
}
