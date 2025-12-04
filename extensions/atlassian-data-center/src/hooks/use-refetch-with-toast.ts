import { useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import type { RefetchOptions } from "@tanstack/react-query";

interface UseRefetchWithToastOptions<TRefetch extends (options?: RefetchOptions) => Promise<unknown>> {
  refetch: TRefetch;
  successMessage?: string;
}

export function useRefetchWithToast<TRefetch extends (options?: RefetchOptions) => Promise<unknown>>({
  refetch,
  successMessage = "Refreshed",
}: UseRefetchWithToastOptions<TRefetch>) {
  return useCallback(async () => {
    try {
      await refetch();
      if (successMessage) showToast(Toast.Style.Success, successMessage);
    } catch {
      // Error handling is done by React Query onError
    }
  }, [refetch, successMessage]);
}
