import { getPreferenceValues, showToast, Toast } from "@raycast/api";
// eslint-disable-next-line no-restricted-imports
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { NativePreferences } from "../types/preferences";

const useApi = <T,>(url: string) => {
  const { apiUrl, apiToken } = getPreferenceValues<NativePreferences>();

  if (!apiToken) {
    showToast({
      style: Toast.Style.Failure,
      title: "Something is wrong with your API Token key. Check your Raycast config and set up a new token.",
      message: "Something wrong with your API Token key. Check your Raycast config and set up a new token.",
    });
  }

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
    [apiToken]
  );

  return useFetch<T>(`${apiUrl}${url}`, { headers, keepPreviousData: true });
};

export default useApi;
