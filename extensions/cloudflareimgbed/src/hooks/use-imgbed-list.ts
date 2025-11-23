import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import type { ListQuery } from "../api/interfaces";
import { ImgBedClient } from "../api/client";
import { getPreferenceValues } from "@raycast/api";
import type { ImgBedPreferences } from "../types/preferences";
import { syncGalleryTagFrequency } from "../utils/tag-store";

export function useImgBedList() {
  const prefs = useMemo(() => getPreferenceValues<ImgBedPreferences>(), []);
  const client = useMemo(() => new ImgBedClient(prefs), [prefs]);
  const [filters, setFilters] = useState<ListQuery>({
    dir: prefs.defaultDir,
    count: prefs.pageSize ?? 50,
    channel: prefs.defaultChannel,
  });

  const { data, isLoading, revalidate, error } = useCachedPromise(
    (currentFilters: ListQuery) => client.listFiles(currentFilters),
    [filters],
    {
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    if (data && data.length > 0) {
      void syncGalleryTagFrequency(data);
    }
  }, [data]);

  const deleteFile = useCallback(
    async (path: string) => {
      try {
        await client.deleteFile(path);
        await showToast(Toast.Style.Success, "Deleted successfully");
        await revalidate();
      } catch (err) {
        await showToast(Toast.Style.Failure, "Failed to delete", (err as Error).message);
        throw err;
      }
    },
    [client, revalidate],
  );

  return {
    files: data ?? [],
    isLoading,
    error,
    filters,
    setFilters,
    reload: revalidate,
    deleteFile,
  };
}
