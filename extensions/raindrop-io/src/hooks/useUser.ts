import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { UserResponse } from "../types";

export function useUser() {
  const preferences = getPreferenceValues<Preferences>();

  return useFetch<UserResponse>("https://api.raindrop.io/rest/v1/user", {
    headers: {
      Authorization: `Bearer ${preferences.token}`,
    },
    keepPreviousData: true,
    onError: () => {
      showToast(Toast.Style.Failure, "Cannot fetch user details");
    },
  });
}
