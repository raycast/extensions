import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { loadAiUsageDashboardData } from "../../lib/claudeDashboardData";

export const aiUsageDashboardQueryKeys = {
  all: ["usageDashboard"] as const,
  claude: () => [...aiUsageDashboardQueryKeys.all, "claude"] as const,
};

export const useAiUsageDashboardQuery = () =>
  useQuery({
    queryFn: () => loadAiUsageDashboardData(),
    queryKey: aiUsageDashboardQueryKeys.claude(),
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 30_000,
  });
