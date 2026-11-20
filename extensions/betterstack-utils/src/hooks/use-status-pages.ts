import { useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { buildStatusPageUrl, listStatusPages } from "@/api/betterstack-status-pages-api";
import { toList } from "@/common/utils/collection-utils";

const STATUS_PAGES_QUERY_KEY = ["status-pages"];

export function useStatusPages() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: STATUS_PAGES_QUERY_KEY,
    queryFn: listStatusPages,
  });

  useEffect(() => {
    if (isError) {
      const message = error instanceof Error ? error.message : String(error);
      void showToast({ style: Toast.Style.Failure, title: "Failed to load status pages", message });
    }
  }, [isError, error]);

  return {
    statusPages: toList(data).map((statusPage) => ({ ...statusPage, url: buildStatusPageUrl(statusPage) })),
    isLoading,
    refresh: () => void queryClient.invalidateQueries({ queryKey: STATUS_PAGES_QUERY_KEY }),
  };
}
