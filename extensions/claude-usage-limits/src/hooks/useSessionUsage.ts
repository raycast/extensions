import { useCCUsageSessionCli } from "./useCCUsageSessionCli";
import { SessionData, ModelUsage } from "../types/usage-types";

type SessionUsageResult = {
  sessionCount: number;
  recentSessions: SessionData[];
  topModels: ModelUsage[];
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
};

export const useSessionUsage = (): SessionUsageResult => {
  const { data: rawData, isLoading, error, revalidate } = useCCUsageSessionCli();

  return {
    sessionCount: rawData?.sessionCount ?? 0,
    recentSessions: rawData?.recentSessions ?? [],
    topModels: rawData?.topModels ?? [],
    isLoading,
    error,
    revalidate,
  };
};
