import { getPreferenceValues, showToast, Toast } from "@raycast/api";
// eslint-disable-next-line no-restricted-imports
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { NativePreferences } from "../types/preferences";
import { Hint, redactData, upgradeAndCaptureError, useCaptureException } from "../utils/sentry";

export class UseApiError extends Error {}
export class UseApiResponseError extends UseApiError {}
export abstract class UseApiRequestError extends UseApiError {}
export class UseApiRequestMissingApiKeyError extends UseApiRequestError {}

export type UseApiOptions<T> = Parameters<typeof useFetch<T>>[1];

const useApi = <T,>(url: string, options: UseApiOptions<T> = {}) => {
  const { headers: optionsHeaders, ...useFetchOptions } = options;
  const hint: Hint = { data: { request: `${url}` } };

  let error: UseApiError | undefined;

  try {
    const { apiUrl, apiToken } = getPreferenceValues<NativePreferences>();

    if (!apiToken) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something is wrong with your API Token key. Check your Raycast config and set up a new token.",
        message: "Something wrong with your API Token key. Check your Raycast config and set up a new token.",
      });

      error = new UseApiRequestMissingApiKeyError("No API key found in configuration");
    }

    const headers = useMemo(
      () => ({
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...optionsHeaders,
      }),
      [apiToken, optionsHeaders]
    );

    const result = {
      error,
      ...useFetch<T>(`${apiUrl}${url}`, {
        headers,
        keepPreviousData: true,
        ...useFetchOptions,
      }),
    };

    useCaptureException(result.error, {
      mutate: (cause) => new UseApiResponseError("Error in response", { cause }),
      hint: {
        ...hint,
        attachments: result.data && [{ data: JSON.stringify(redactData(result)), filename: "response.json" }],
      },
    });

    return result;
  } catch (error) {
    throw upgradeAndCaptureError(
      error,
      UseApiError,
      (cause) => new UseApiError("Something went wrong", { cause }),
      hint
    );
  }
};

export default useApi;
