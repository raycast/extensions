import { LaunchType, LocalStorage, Toast, environment, popToRoot, showToast } from "@raycast/api";
import fetch, { RequestInit } from "node-fetch";
import { clearCache } from "./cache";
import { FORGE_API_URL } from "../config";
import { JsonApiList, JsonApiResource } from "./jsonapi";

const doTheFetch = async (url: string, options?: RequestInit) => {
  const isBackground = environment.launchType === LaunchType.Background;
  let res;
  try {
    res = await fetch(url, options);
  } catch (e) {
    if (e instanceof Error) {
      console.error({ error: e, url });
      isBackground || showResetToast({ title: `Error ${res?.status}: ${e.message}` });
      throw new Error(e.message);
    }
  }
  if (!res?.ok) {
    console.error({ status: res?.status, text: res?.statusText, url });
    isBackground || showResetToast({ title: `Error ${res?.status}: ${res?.statusText}` });
    throw new Error(res?.statusText);
  }
  return res;
};

export const apiFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const res = await doTheFetch(url, options);
  if (!res?.ok) return {} as T;
  return (await res.json()) as T;
};

const showResetToast = ({ title }: { title: string }) =>
  showToast({
    style: Toast.Style.Failure,
    title,
    primaryAction: {
      title: "Reset cache",
      onAction: async () => {
        // not working?
        await clearCache();
        await LocalStorage.clear();
        await showToast(Toast.Style.Success, "Cache cleared");
        popToRoot({ clearSearchBar: true });
      },
    },
  });

export const authHeaders = (token: string): Record<string, string> => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  Authorization: `Bearer ${token}`,
});

const FORGE_ORIGIN = new URL(FORGE_API_URL).origin;

export const fetchAllPages = async <A>(url: string, options?: RequestInit): Promise<JsonApiResource<A>[]> => {
  const results: JsonApiResource<A>[] = [];
  let nextUrl: string | null = url;
  while (nextUrl) {
    const page: JsonApiList<A> = await apiFetch<JsonApiList<A>>(nextUrl, options);
    results.push(...(page?.data ?? []));
    const next = page?.links?.next;
    if (!next) break;
    // Only follow same-origin pagination — never send the Forge bearer token to another origin.
    let resolved: URL;
    try {
      resolved = new URL(next, FORGE_API_URL);
    } catch {
      break;
    }
    if (resolved.origin !== FORGE_ORIGIN) break;
    nextUrl = resolved.toString();
  }
  return results;
};
