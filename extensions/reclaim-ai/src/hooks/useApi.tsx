import {
  Action,
  Detail,
  getPreferenceValues,
  openCommandPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { NativePreferences } from "../types/preferences";
import { fetcher, fetchPromise } from "../utils/fetcher";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";

const useApi = () => {
  const { apiToken } = getPreferenceValues<NativePreferences>();

  // const { push } = useNavigation();

  if (!apiToken) {
    // push(
    //   <Detail
    //     markdown={"Something is wrong with your API Token key. Check your Raycast config and set up a new token."}
    //     actions={<Action title="Open Preferences" onAction={openCommandPreferences} />}
    //   />
    // );
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

  const useFetchRai = <T,>(url: RequestInfo) => useFetch<T>(url, { headers, keepPreviousData: true });

  return { fetcher, fetchPromise, useFetchRai };
};

export default useApi;
