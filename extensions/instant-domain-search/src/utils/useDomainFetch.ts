import { useFetch, useLocalStorage } from "@raycast/utils";
import type { DomainSearchResponse } from "./types";
import { useMemo } from "react";
import { randomUUID } from "node:crypto";
import { ANONYMOUS_USER_ID_KEY, ROOT_URL, TLDs } from "./config";
import getUserAgent from "./getUserAgent";

export default function useDomainFetch(query: string) {
  const parsedSearch = useMemo(() => {
    const trimmedText = query.trim();

    // Check if searchText contains a dot (indicating a TLD)
    const dotIndex = trimmedText.indexOf(".");

    if (dotIndex > 0) {
      // Has an extension
      const query = trimmedText.substring(0, dotIndex);
      const tld = trimmedText.substring(dotIndex); // includes the dot
      return { query, tld };
    } else {
      // No extension, use .com as default
      return { query: trimmedText, tld: ".com" };
    }
  }, [query]);

  const { value: anonymousUserID, isLoading: isAnonymousUserIDLoading } = useLocalStorage(
    ANONYMOUS_USER_ID_KEY,
    randomUUID(),
  );

  const searchParams = useMemo(() => {
    return new URLSearchParams({
      index: "semantic",
      tlds: TLDs.join(","),
    });
  }, []);

  return useFetch(`${ROOT_URL}/api/v1/domain/${parsedSearch.query}${parsedSearch.tld}?${searchParams.toString()}`, {
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
