import { useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { buildMonitorWebUrl, listMonitors } from "@/api/betterstack-monitors-api";
import { Optional } from "@/common/utils/optional-utils";
import { toList } from "@/common/utils/collection-utils";

const MONITORS_QUERY_KEY = ["monitors"];

export function useMonitors({ teamId }: { teamId: Optional<string> }) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: MONITORS_QUERY_KEY,
    queryFn: listMonitors,
  });

  useEffect(() => {
    if (isError) {
      const message = error instanceof Error ? error.message : String(error);
      void showToast({ style: Toast.Style.Failure, title: "Failed to load monitors", message });
    }
  }, [isError, error]);

  return {
    monitors: toList(data).map((monitor) => ({ ...monitor, webUrl: buildMonitorWebUrl(monitor.id, teamId) })),
    isLoading,
    refresh: () => void queryClient.invalidateQueries({ queryKey: MONITORS_QUERY_KEY }),
  };
}
