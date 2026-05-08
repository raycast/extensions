import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { loadAmpUsageDashboardData } from "../../lib/ampDashboardData";

export const ampUsageDashboardQueryKeys = {
  all: ["usageDashboard"] as const,
  amp: () => [...ampUsageDashboardQueryKeys.all, "amp"] as const,
};

export const useAmpUsageDashboardQuery = () =>
  useQuery({
    queryFn: () => loadAmpUsageDashboardData(),
    queryKey: ampUsageDashboardQueryKeys.amp(),
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 30_000,
  });
