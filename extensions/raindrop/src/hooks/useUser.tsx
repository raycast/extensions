import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Preferences, UserResponse } from "../types";

export function useUser() {
  const preferences: Preferences = getPreferenceValues();

  const { isLoading, data, revalidate } = useFetch<UserResponse>(
    `https://api.raindrop.io/rest/v1/user`,
    {
      headers: {
        Authorization: `Bearer ${preferences.token}`,
      },
      keepPreviousData: true,
      onError: () => {
        showToast(Toast.Style.Failure, "Cannot fetch user details");
      },
    }
  );

  return { isLoading, data, revalidate };
}
