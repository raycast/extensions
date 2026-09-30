import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { CollectionsResponse } from "../types";

export function useCollections() {
  const preferences: Preferences = getPreferenceValues();

  return useFetch<CollectionsResponse>(`https://api.raindrop.io/rest/v1/collections/all`, {
    headers: {
      Authorization: `Bearer ${preferences.token}`,
    },
    keepPreviousData: true,
    onError: () => {
      showToast(Toast.Style.Failure, "Cannot fetch collections");
    },
  });
}
