import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { parse, type BaseSchema, Output } from "valibot";
import fetch from "cross-fetch";

const preferences = getPreferenceValues<Preferences>();

export function useMite<T extends BaseSchema<unknown, unknown>>(url: string, validation: T, init?: RequestInit) {
  const fetched = useFetch<Output<T>>(`${preferences.mite_domain}${url}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-MiteApiKey": preferences.mite_api_key,
      ...(init?.headers ?? {}),
    },
  });
  if (!fetched.isLoading) {
    const data = parse(validation, fetched.data);
    return {
      ...fetched,
      data,
    };
  }
  return fetched;
}

export function fetch_mite(url: string, init?: RequestInit) {
  return fetch(`${preferences.mite_domain}${url}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-MiteApiKey": preferences.mite_api_key,
      ...(init?.headers ?? {}),
    },
  });
}
