import { useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import type { FetchNextPageOptions } from "@tanstack/react-query";

interface UseFetchNextPageWithToastOptions<
  TFetchNextPage extends (options?: FetchNextPageOptions) => Promise<unknown>,
> {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: TFetchNextPage;
  successMessage?: string;
}

export function useFetchNextPageWithToast<TFetchNextPage extends (options?: FetchNextPageOptions) => Promise<unknown>>({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  successMessage,
}: UseFetchNextPageWithToastOptions<TFetchNextPage>) {
  return useCallback(async () => {
    if (hasNextPage && !isFetchingNextPage) {
      try {
        await fetchNextPage();
        if (successMessage) showToast(Toast.Style.Success, successMessage);
      } catch {
        // Error handling is done by React Query onError
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, successMessage]);
}
