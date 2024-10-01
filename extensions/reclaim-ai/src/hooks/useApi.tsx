import { getPreferenceValues, showToast, Toast } from "@raycast/api";
// eslint-disable-next-line no-restricted-imports
import { useFetch } from "@raycast/utils";
import { captureException, ExclusiveEventHintOrCaptureContext, startSpan, StartSpanOptions } from "@sentry/node";
import { useEffect, useMemo } from "react";
import { NativePreferences } from "../types/preferences";

export type UseAPiOptions = {
  errorOptions?: {
    hint?: ExclusiveEventHintOrCaptureContext;
  };
};

const useApi = <T,>(url: string, options: UseAPiOptions = {}) => {
  const { errorOptions } = options;

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

  const result = useFetch<T>(`${apiUrl}${url}`, { headers, keepPreviousData: true });

  result.error = new Error("Something went wrong! 2");

  useEffect(() => {
    if (result.error)
      return startSpan({ name: "useApi-call" }, () => {
        captureException(result.error, errorOptions?.hint);
      });
  }, [result.error]);

  return result;
};

export default useApi;
