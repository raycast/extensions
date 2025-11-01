import type { FoldersResponse } from "../types/folders.dt";
import useClickUp from "./useClickUp";

function useFolders(spaceId: string) {
  const { isLoading, data } = useClickUp<FoldersResponse>(`/space/${spaceId}/folder?archived=false`);
  return { isLoading, folders: data?.folders ?? [] };
}

export { useFolders };
