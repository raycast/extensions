import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { NativePreferences } from "../types/preferences";
import { fetcher, fetchPromise } from "../utils/fetcher";

const useApi = () => {
  const { apiUrl, apiToken } = getPreferenceValues<NativePreferences>();

  // const { push } = useNavigation();

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

  const useFetchRai = <T,>(url: string) => useFetch<T>(`${apiUrl}${url}`, { headers, keepPreviousData: true });

  return { fetcher, fetchPromise, useFetchRai };
};

export default useApi;
