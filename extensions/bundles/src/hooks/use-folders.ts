import { useCachedPromise } from "@raycast/utils";
import { getFolders, invalidateFoldersCache, deleteFolder } from "../storage";
import { Folder } from "../types";
import { useCallback, useMemo } from "react";
import { showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { sortFolders } from "../utils";
import { getNestedFolderIds } from "../form-utils";
import { DEFAULT_SORT, NO_SORT } from "../constants";

/**
 * Get folders data with common operations and computed properties
 * Uses onPop callbacks on Action.Push for data refresh instead of polling.
 */
export function useFoldersData(): {
  folders: Folder[];
  topLevelFolders: Folder[];
  nestedFolders: Folder[];
  isLoading: boolean;
  revalidate: () => void;
  handleSave: () => void;
  handleDelete: (folderId: string, folderName: string) => Promise<void>;
} {
  const {
    data = [],
    isLoading,
    revalidate,
    mutate,
  } = useCachedPromise(getFolders, [], {
    keepPreviousData: true,
    failureToastOptions: { title: "Failed to load bundles" },
  });

  // Find all folder IDs that are nested within other folders (reuse form-utils function)
  const nestedFolderIds = useMemo(() => getNestedFolderIds(data), [data]);

  // Sort folders and separate by nesting status
  const { topLevelFolders, nestedFolders } = useMemo(() => {
    const sorted = sortFolders(data, DEFAULT_SORT, NO_SORT, NO_SORT);
    return {
      topLevelFolders: sorted.filter((f) => !nestedFolderIds.has(f.id)),
      nestedFolders: sorted.filter((f) => nestedFolderIds.has(f.id)),
    };
  }, [data, nestedFolderIds]);

  const handleSave = useCallback(async () => {
    invalidateFoldersCache();
    await revalidate();
  }, [revalidate]);

  const handleDelete = useCallback(
    async (folderId: string, folderName: string) => {
      const confirmed = await confirmAlert({
        title: "Delete Bundle",
        message: `Are you sure you want to delete "${folderName}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) return;

      // Optimistic update
      await mutate(
        deleteFolder(folderId).then(() => {
          invalidateFoldersCache();
          return getFolders();
        }),
        {
          optimisticUpdate: (currentData) => currentData?.filter((f) => f.id !== folderId) ?? [],
        },
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Bundle deleted",
      });
    },
    [mutate],
  );

  return {
    folders: data,
    topLevelFolders,
    nestedFolders,
    isLoading,
    revalidate,
    handleSave,
    handleDelete,
  };
}
