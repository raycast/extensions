import { useMemo } from "react";
import { showFailureToast, useFetch } from "@raycast/utils";
import { type ArchiveItem, parseArchivePage } from "@/api";
import { USER_AGENT } from "@/constants";

export const useArchive = (baseURL: string, onErrorPrimaryAction: () => void, queryText?: string) => {
  const url = useMemo(() => {
    if (queryText && queryText.length > 0) {
      return `${baseURL}/search?q=${encodeURIComponent(queryText)}`;
    }
    return null;
  }, [baseURL, queryText]);

  const {
    data: list,
    error,
    isLoading,
    revalidate,
  } = useFetch<ArchiveItem[]>(url ?? "", {
    headers: {
      "User-Agent": USER_AGENT,
    },
    execute: url !== null,
    parseResponse: async (response) => {
      if (!response.ok) {
        const errorMessages: Record<number, string> = {
          404: "No results found",
          500: "Internal server error",
          502: "Bad gateway",
          503: "Service unavailable",
        };
        const message = errorMessages[response.status] ?? "Network response was not ok";
        throw new Error(`${message}: ${response.statusText}`);
      }
      const text = await response.text();
      return parseArchivePage(text);
    },
    onError: (error) => {
      showFailureToast(error, {
        title: "Failed to fetch data",
        primaryAction: onErrorPrimaryAction
          ? { title: "Test Mirrors", onAction: () => onErrorPrimaryAction() }
          : undefined,
      });
    },
  });

  return {
    data: list,
    isLoading,
    error,
    revalidate,
  };
};
