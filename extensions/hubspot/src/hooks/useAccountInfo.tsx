import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Data } from "../types/account";

export function useAccountInfo() {
  const preferences = getPreferenceValues();
  const accessToken = preferences?.accessToken;

  const { isLoading, data, revalidate } = useFetch<Data>(`https://api.hubapi.com/account-info/v3/details`, {
    method: "get",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    keepPreviousData: true,
  });

  return { isLoading, data, revalidate };
}
