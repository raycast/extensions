import { useFetch, useLocalStorage } from "@raycast/utils";
import type { DomainSearchResponse } from "./types";
import { useMemo } from "react";
import { randomUUID } from "node:crypto";
import { ANONYMOUS_USER_ID_KEY, ROOT_URL, POPULAR_TLDs, ALL_TLDs } from "./config";
import getUserAgent from "./getUserAgent";

export default function useDomainFetch(query: string) {
  const regex = useMemo(() => {
    const tldsPattern = Array.from(ALL_TLDs)
      .sort((a, b) => b.length - a.length)
      .map((tld) => tld.replace(".", "\\."))
      .join("|");
    return new RegExp(`^(?<domain>.+?)(\\.(?<tld>${tldsPattern}))?$`);
  }, []);
  const parsedSearch = useMemo(() => {
    const trimmedQuery = query.trim();
    const match = trimmedQuery.match(regex);
    const domain = match?.groups?.domain ?? trimmedQuery;
    const tld = match?.groups?.tld ?? "com";
    return { domain, tld };
  }, [query, regex]);

  const { value: anonymousUserID, isLoading: isAnonymousUserIDLoading } = useLocalStorage(
    ANONYMOUS_USER_ID_KEY,
    randomUUID(),
  );

  const searchParams = useMemo(() => {
    return new URLSearchParams({
      index: "semantic",
      tlds: [...new Set([parsedSearch.tld, ...POPULAR_TLDs])].slice(0, POPULAR_TLDs.length).join(","),
    });
  }, [parsedSearch.tld]);

  return useFetch(`${ROOT_URL}/api/v1/domain/${parsedSearch.domain}.${parsedSearch.tld}?${searchParams.toString()}`, {
    execute: query.length >= 2 && anonymousUserID !== undefined && !isAnonymousUserIDLoading,
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
