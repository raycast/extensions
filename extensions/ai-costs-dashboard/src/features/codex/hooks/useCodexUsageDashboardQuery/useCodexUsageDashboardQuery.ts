import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { loadCodexUsageDashboardData } from "../../lib/codexDashboardData";

export const codexUsageDashboardQueryKeys = {
  all: ["usageDashboard"] as const,
  codex: () => [...codexUsageDashboardQueryKeys.all, "codex"] as const,
};

export const useCodexUsageDashboardQuery = () =>
  useQuery({
    queryFn: () => loadCodexUsageDashboardData(),
    queryKey: codexUsageDashboardQueryKeys.codex(),
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 30_000,
  });
