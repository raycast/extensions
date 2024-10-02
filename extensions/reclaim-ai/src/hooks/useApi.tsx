import { getPreferenceValues, showToast, Toast } from "@raycast/api";
// eslint-disable-next-line no-restricted-imports
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { NativePreferences } from "../types/preferences";
import {
  Hint,
  redactData,
  ResolvableSpan,
  upgradeAndCaptureError,
  useCaptureInSpan,
  useSpanWithParent,
} from "../utils/sentry";

export class UseApiError extends Error {}
export class UseApiResponseError extends UseApiError {}
export abstract class UseApiRequestError extends UseApiError {}
export class UseApiRequestMissingApiKeyError extends UseApiRequestError {}

export type UseAPiOptions = {
  readonly sentrySpan?: ResolvableSpan;
};

const useApi = <T,>(url: string, options: UseAPiOptions = {}) => {
  const { sentrySpan } = options;
  const span = useSpanWithParent(sentrySpan, { name: "useApi" });
  const hint: Hint = { data: { request: `${url}` } };

  try {
    const { apiUrl, apiToken } = getPreferenceValues<NativePreferences>();

    if (!apiToken) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something is wrong with your API Token key. Check your Raycast config and set up a new token.",
        message: "Something wrong with your API Token key. Check your Raycast config and set up a new token.",
      });

      throw new UseApiRequestMissingApiKeyError("No API key found in configuration");
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
    });

    useCaptureInSpan(span, result.error, {
      mutate: (cause) => new UseApiResponseError("Error in response", { cause }),
      hint: { ...hint, data: { ...hint.data, response: redactData(result) } },
    });

    return result;
  } catch (error) {
    throw upgradeAndCaptureError(
      span,
      error,
      UseApiError,
      (cause) => new UseApiError("Something went wrong", { cause }),
      hint
    );
  }
};

export default useApi;
