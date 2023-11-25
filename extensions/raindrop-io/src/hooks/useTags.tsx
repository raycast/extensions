import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Preferences, TagsResponse } from "../types";

export function useTags() {
  const preferences: Preferences = getPreferenceValues();

  const url = `https://api.raindrop.io/rest/v1/tags`;
  const { isLoading, data, revalidate } = useFetch<TagsResponse>(url, {
    headers: {
      Authorization: `Bearer ${preferences.token}`,
    },
    keepPreviousData: true,
    onError: () => {
      showToast(Toast.Style.Failure, "Cannot fetch tags");
    },
  });

  return { isLoading, data, revalidate };
}
