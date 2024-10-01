import { getPreferenceValues, showToast, Toast } from "@raycast/api";
// eslint-disable-next-line no-restricted-imports
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { NativePreferences } from "../types/preferences";
import { captureInSpan, ResolvableSpan, resolveSpan, useCaptureInSpan } from "../utils/sentry";

export type UseAPiOptions = {
  readonly sentrySpan?: ResolvableSpan;
};

const useApi = <T,>(url: string, options: UseAPiOptions = {}) => {
  const { sentrySpan } = options;
  const span = useMemo(() => resolveSpan(sentrySpan || { name: "useApi" }), [sentrySpan]);

  try {
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

    const result = useFetch<T>(`${apiUrl}${url}`, {
      headers,
      keepPreviousData: true,
      onError: (e) => captureInSpan(span, e),
    });

    useCaptureInSpan(span, result.error);

    return result;
  } catch (e) {
    captureInSpan(span, e);
    throw e;
  }
};

export default useApi;
