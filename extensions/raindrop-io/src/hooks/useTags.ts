import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { TagsResponse } from "../types";

export function useTags() {
  const preferences: Preferences = getPreferenceValues();

  return useFetch<TagsResponse>("https://api.raindrop.io/rest/v1/tags", {
    headers: {
      Authorization: `Bearer ${preferences.token}`,
    },
    keepPreviousData: true,
    onError: () => {
      showToast(Toast.Style.Failure, "Cannot fetch tags");
    },
  });
}
