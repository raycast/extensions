import { useCCUsageSessionCli } from "./useCCUsageSessionCli";
import { SessionData, ModelUsage } from "../types/usage-types";

type SessionUsageResult = {
  recentSessions: SessionData[];
  topModels: ModelUsage[];
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
};

export const useSessionUsage = (): SessionUsageResult => {
  const { data: rawData, isLoading, error, revalidate } = useCCUsageSessionCli();

  return {
    recentSessions: rawData?.recentSessions ?? [],
    topModels: rawData?.topModels ?? [],
    isLoading,
    error,
    revalidate,
  };
};
