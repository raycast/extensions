import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Preferences, CollectionsResponse } from "../types";

export function useCollections() {
  const preferences: Preferences = getPreferenceValues();

  const { isLoading, data, revalidate } = useFetch<CollectionsResponse>(
    `https://api.raindrop.io/rest/v1/collections/all`,
    {
      headers: {
        Authorization: `Bearer ${preferences.token}`,
      },
      keepPreviousData: true,
      onError: () => {
        showToast(Toast.Style.Failure, "Cannot fetch collections");
      },
    }
  );

  return { isLoading, data, revalidate };
}
