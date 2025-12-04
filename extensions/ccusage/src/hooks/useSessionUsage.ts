import { useCCUsageSessionCli } from "./useCCUsageSessionCli";
import { SessionData, ModelUsage } from "../types/usage-types";
import { getRecentSessions, calculateModelUsage, getTopModels } from "../utils/usage-calculator";

const DEFAULT_DISPLAY_LIMIT = 5;

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
  const recentSessions = getRecentSessions(sessions, DEFAULT_DISPLAY_LIMIT);
  const topModels = sessions.length > 0 ? getTopModels(calculateModelUsage(sessions), DEFAULT_DISPLAY_LIMIT) : [];

  return {
    sessions,
    recentSessions,
    topModels,
    isLoading,
    error,
    revalidate,
  };
};
