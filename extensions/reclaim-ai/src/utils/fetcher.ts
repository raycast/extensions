import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch, { FetchError, RequestInit } from "node-fetch";
import { NativePreferences } from "../types/preferences";
import { errorCoverage, redactData, upgradeAndCaptureError } from "./sentry";
import { Attachment } from "@sentry/node";
import { filterFalsy } from "./arrays";

const { apiToken, apiUrl } = getPreferenceValues<NativePreferences>();

export abstract class FetcherError extends Error {}

export abstract class FetcherRequestError extends FetcherError {}
export class FetcherRequestPrepError extends FetcherRequestError {}
export class FetcherRequestMissingApiKeyError extends FetcherRequestError {}
export class FetcherRequestFailedError extends FetcherRequestError {}
export class FetcherRequestInvalidJSONError extends FetcherRequestError {}

export abstract class FetcherResponseError extends FetcherError {}
export class FetcherResponseInvalidJSONError extends FetcherRequestError {}

export type FetcherOptions = {
  init?: RequestInit;
  payload?: unknown;
};

export const fetcher = async <T>(url: string, options: FetcherOptions = {}): Promise<T> => {
  const { init, payload } = options;

  const getErrorHintAttachments = (response?: string): Attachment[] =>
    filterFalsy([
      !!response && { filename: "response.json", data: response },
      !!payload && { filename: "request.json", data: JSON.stringify(redactData(payload)) },
    ]);

  return errorCoverage(
    () => {
      if (!apiToken) {
        showToast({
          style: Toast.Style.Failure,
          title: "Something is wrong with your API Token key. Check your Raycast config and set up a new token.",
          message: "Something wrong with your API Token key. Check your Raycast config and set up a new token.",
        });

        throw new FetcherRequestMissingApiKeyError("No API key found in configuration");
      }

      let body: string | undefined;
      try {
        if (payload) body = JSON.stringify(payload);
      } catch (cause) {
        throw new FetcherRequestInvalidJSONError("Could not parse request JSON", { cause });
      }

      return fetch(`${apiUrl}${url}`, {
        ...init,
        body,
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...init?.headers,
        },
      })
        .catch((error) => {
          throw upgradeAndCaptureError(
            error,
            FetcherError,
            (cause) => new FetcherRequestFailedError("The request failed", { cause }),
            { attachments: getErrorHintAttachments() }
          );
        })
        .then<T>(async (r) => {
          try {
            return r.json();
          } catch (error) {
            let txt: string;

            try {
              txt = await r.text();
            } catch {
              txt = '{message:"[[TEXT FAILED]]"}';
            }

            throw upgradeAndCaptureError(
              error,
              FetcherError,
              (cause) => new FetcherResponseInvalidJSONError("Could not parse response JSON", { cause }),
              { attachments: getErrorHintAttachments(txt) }
            );
          }
        });
    },
    {
      rethrow: true,
      onError: (cause) => {
        if (cause instanceof FetcherError) return cause;
        return new FetcherRequestPrepError("Something went wrong while preparing the request", { cause });
      },
      hint: { attachments: getErrorHintAttachments() },
    }
  );
};

export type FetchPromiseOptions = FetcherOptions;

export const fetchPromise = async <T>(
  url: string,
  options?: FetchPromiseOptions
): Promise<[T, null] | [null, FetchError | undefined]> => {
  try {
    const result: Awaited<T> = await fetcher(url, options);
    return [result, null];
  } catch (err) {
    return [null, err as FetchError];
  }
};
