import { useFetch, useLocalStorage } from "@raycast/utils";
import type { DomainSearchResponse } from "./types";
import { useMemo } from "react";
import { randomUUID } from "node:crypto";
import { ANONYMOUS_USER_ID_KEY, ROOT_URL, POPULAR_TLDs, ALL_TLDs } from "./config";
import getUserAgent from "./getUserAgent";
import { TLDs as GlobalTLDs } from "global-tld-list";

export default function useDomainFetch(query: string) {
  const { value: anonymousUserID, isLoading: isAnonymousUserIDLoading } = useLocalStorage(
    ANONYMOUS_USER_ID_KEY,
    randomUUID(),
  );

  const parsedSearch = useMemo(() => {
    const trimmedText = query.trim();

    if (!trimmedText) {
      return { query: "", tld: ".com" };
    }

    const dotIndex = trimmedText.indexOf(".");

    if (dotIndex > 0) {
      const queryPart = trimmedText.substring(0, dotIndex);
      const tldWithDot = trimmedText.substring(dotIndex);
      const tldWithoutDot = tldWithDot.substring(1);

      if (!tldWithoutDot) {
        return { query: queryPart, tld: ".com" };
      }

      if (GlobalTLDs.isValid(tldWithoutDot)) {
        return { query: queryPart, tld: tldWithDot };
      } else {
        return { query: trimmedText, tld: ".com" };
      }
    } else {
      return { query: trimmedText, tld: ".com" };
    }
  }, [query]);

  const searchParams = useMemo(() => {
    const tldWithoutDot = parsedSearch.tld.substring(1);

    const tldsList = TLDs.includes(tldWithoutDot) ? TLDs : [tldWithoutDot, ...TLDs];

    const params = new URLSearchParams({
      index: "semantic",
      tlds: tldsList.join(","),
    });
    return params;
  }, [parsedSearch.tld]);

  const url = `${ROOT_URL}/api/v1/domain/${parsedSearch.query}${parsedSearch.tld}?${searchParams.toString()}`;
  const shouldExecute = query.length >= 2 && anonymousUserID !== undefined && !isAnonymousUserIDLoading;

  return useFetch(url, {
    execute: shouldExecute,
    keepPreviousData: true,
    headers: {
      "User-Agent": getUserAgent(),
      "X-Requested-With": "Raycast-IDS",
      "X-Raycast-Anonymous-UUID": anonymousUserID!,
    },
    parseResponse: async (response) => {
      if (response.status === 429) {
        return { type: "error-429" } as const;
      }
      const json = (await response.json()) as DomainSearchResponse;
      return {
        type: "success" as const,
        data: json,
      };
    },
  });
}
