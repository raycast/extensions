import fetch from "node-fetch";
import { URL } from "node:url";
import { useRef } from "react";
import urljoin from "url-join";

import { Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import type { MDNResponse } from "@/types";

export const useSearch = (query: string | null, locale: string) => {
  const abortable = useRef<AbortController>();
  const url = new URL("https://developer.mozilla.org/api/v1/search");

  url.searchParams.append("q", query || "");
  url.searchParams.append("sort", "best");
  url.searchParams.append("locale", locale);

  const { isLoading, data, revalidate, error } = useCachedPromise(
    async (url: string) => {
      const response = await fetch(url, { signal: abortable.current?.signal });
      const res = (await response.json()) as unknown as MDNResponse;
      return res.documents.map((document) => {
        document.url = urljoin("https://developer.mozilla.org", document.mdn_url);
        return document;
      });
    },
    [url.toString()],
    {
      keepPreviousData: true,
      abortable,
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: `Could not load MDN results`,
          message: String(err),
        });
      },
    },
  );

  return { isLoading, data, revalidate, error };
};
