import { Cache, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetch } from "cross-fetch";
import * as devalue from "devalue";
import { useRef } from "react";
import { getUserAgent } from "./get-user-agent";

const CACHE_DURATION = 30 * 60 * 1000;
const LAST_UPDATED_AT_CACHE_KEY = "last-updated-at";
const DATE_CACHE_KEY = "data";

export function createSplatoonApiHook<Response, Data>(url: string, transform: (response: Response) => Data) {
  const cache = new Cache({
    namespace: encodeURIComponent(url),
  });

  return () => {
    const abortable = useRef<AbortController>();

    return useCachedPromise(
      async () => {
        const lastUpdatedAt = cache.has(LAST_UPDATED_AT_CACHE_KEY) ? Number(cache.get(LAST_UPDATED_AT_CACHE_KEY)) : 0;

        if (Date.now() - lastUpdatedAt < CACHE_DURATION && cache.has(DATE_CACHE_KEY)) {
          return devalue.parse(cache.get(DATE_CACHE_KEY)!) as Data;
        }

        const response = await fetch(url, {
          headers: { "User-Agent": getUserAgent() },
          signal: abortable.current?.signal,
        });
        const data = transform((await response.json()) as Response);

        cache.set(LAST_UPDATED_AT_CACHE_KEY, String(Date.now()));
        cache.set(DATE_CACHE_KEY, devalue.stringify(data));

        return data;
      },
      [],
      {
        abortable,
        onError: (error) => {
          showToast({
            style: Toast.Style.Failure,
            title: (error as Error).name,
            message: (error as Error).message,
          });
        },
      },
    );
  };
}
