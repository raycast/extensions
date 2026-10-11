import { useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listStatusPageResources, listStatusPageSections } from "@/api/betterstack-status-page-resources-api";
import { groupResourcesBySection } from "@/domain/status-page-resource";
import { toList } from "@/common/utils/collection-utils";

export function useStatusPageDetail(statusPageId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["status-page-detail", statusPageId];

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const [sections, resources] = await Promise.all([
        listStatusPageSections(statusPageId),
        listStatusPageResources(statusPageId),
      ]);
      return groupResourcesBySection(sections, resources);
    },
  });

  useEffect(() => {
    if (isError) {
      const message = error instanceof Error ? error.message : String(error);
      void showToast({ style: Toast.Style.Failure, title: "Failed to load status page details", message });
    }
  }, [isError, error]);

  return {
    sections: toList(data),
    isLoading,
    isError,
    refresh: () => void queryClient.invalidateQueries({ queryKey }),
  };
}
