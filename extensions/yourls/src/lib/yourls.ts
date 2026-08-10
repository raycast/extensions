/* eslint-disable @typescript-eslint/no-explicit-any */
import nodeUrl from "url";
import { TAction, TError } from "../types";
import fetch, { RequestInit } from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { sanitizeUrl } from "@braintree/sanitize-url";

export const yourls = async <Response>({
  action,
  params,
  config,
}: { action?: TAction; params?: Record<string, string>; config?: RequestInit } = {}) => {
  const preferences = getPreferenceValues<Preferences>();
  const apiURL = sanitizeUrl(preferences.api);
  const signature = preferences.signature;

  const urlParams = nodeUrl.format({
    query: {
      signature,
      format: "json",
      action,
      ...params,
    },
  });

  const url = `${apiURL}${urlParams}`;

  const res = await fetch(url, {
    ...config,
  });

  if (res.ok) {
    return (await res.json()) as Response;
  }

  const errorRes = (await res.json()) as TError;
  const errMesssage = errorRes.message || "Failed to fetch data";
  throw new Error(errMesssage);
};
