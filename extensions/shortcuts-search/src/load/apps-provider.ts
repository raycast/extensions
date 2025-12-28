import { useFetch } from "@raycast/utils";
import { AppsResponse, AppMetadata } from "../model/input/input-models";
import { getPlatform } from "./platform";

const emptyApps: AppMetadata[] = [];

interface UseAppsResult {
  isLoading: boolean;
  data: AppMetadata[];
}

export function useApps(): UseAppsResult {
  const platform = getPlatform();

  const { isLoading, data } = useFetch<AppsResponse>(`https://hotkys.com/data/${platform}/apps.json`, {
    keepPreviousData: true,
    failureToastOptions: {
      title: "Failed to load applications",
    },
  });

  return {
    isLoading,
    data: data?.apps ?? emptyApps,
  };
}
