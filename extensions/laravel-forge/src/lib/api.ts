import { LocalStorage, Toast, popToRoot, showToast } from "@raycast/api";
import fetch, { RequestInit } from "node-fetch";
import { clearCache } from "./cache";

const doTheFetch = async (url: string, options?: RequestInit) => {
  let res;
  try {
    res = await fetch(url, options);
  } catch (e) {
    if (e instanceof Error) {
      console.error({ error: e, url });
      showResetToast({ title: `Error ${res?.status}: ${e.message}` });
      throw new Error(e.message);
    }
  }
  if (!res?.ok) {
    console.error({ status: res?.status, text: res?.statusText, url });
    showResetToast({ title: `Error ${res?.status}: ${res?.statusText}` });
    throw new Error(res?.statusText);
  }
  return res;
};

export const apiFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const res = await doTheFetch(url, options);
  if (!res?.ok) return {} as T;
  return (await res.json()) as T;
};

export const apiFetchText = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const res = await doTheFetch(url, options);
  if (!res?.ok) return "" as T;
  return (await res.text()) as T;
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
