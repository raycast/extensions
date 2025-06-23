import { useCCUsageSessionCli } from "./useCCUsageSessionCli";
import { SessionData, ModelUsage } from "../types/usage-types";
import { getRecentSessions, calculateModelUsage, getTopModels } from "../utils/usage-calculator";

type SessionUsageResult = {
  sessions: SessionData[];
  recentSessions: SessionData[];
  topModels: ModelUsage[];
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
};

export const useSessionUsage = (): SessionUsageResult => {
  const { data: rawData, isLoading, error, revalidate } = useCCUsageSessionCli();

  const sessions = rawData?.sessions ?? [];
  const recentSessions = getRecentSessions(sessions, 5);
  const topModels = sessions.length > 0 ? getTopModels(calculateModelUsage(sessions), 5) : [];

  return {
    sessions,
    recentSessions,
    topModels,
    isLoading,
    error,
    revalidate,
  };
};
