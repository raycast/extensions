import { useExec } from "@raycast/utils";
import { useInterval } from "usehooks-ts";
import { cpus } from "os";
import { DailyUsageData, SessionData, ModelUsage } from "../types/usage-types";
import { getRecentSessions, calculateModelUsage } from "../utils/usage-calculator";
import { preferences } from "../preferences";

// Local type definitions for this hook
type UsageStats = {
  todayUsage: DailyUsageData | null;
  totalUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  } | null;
  recentSessions: SessionData[];
  topModels: ModelUsage[];
  isLoading: boolean;
  error?: string;
};

const getEnhancedNodePaths = (): string => {
  const isAppleSilicon = cpus()[0]?.model?.includes("Apple") ?? false;

  const platformPaths = isAppleSilicon
    ? ["/opt/homebrew/bin", "/opt/homebrew/lib/node_modules/.bin"]
    : ["/usr/local/bin", "/usr/local/lib/node_modules/.bin"];

  const versionManagerPaths = [
    `${process.env.HOME}/.nvm/versions/node/*/bin`,
    `${process.env.HOME}/.fnm/node-versions/*/installation/bin`,
    `${process.env.HOME}/.n/bin`,
    `${process.env.HOME}/.volta/bin`,
  ];

  const systemPaths = ["/usr/bin", "/bin", `${process.env.HOME}/.npm/bin`, `${process.env.HOME}/.yarn/bin`];

  const allPaths = [process.env.PATH || "", ...platformPaths, ...versionManagerPaths, ...systemPaths];

  return allPaths.filter((path) => path).join(":");
};

const execOptions = {
  shell: false,
  timeout: 30000,
  cwd: process.env.HOME,
  env: {
    ...process.env,
    PATH: getEnhancedNodePaths(),
    NVM_DIR: process.env.NVM_DIR || `${process.env.HOME}/.nvm`,
    FNM_DIR: process.env.FNM_DIR || `${process.env.HOME}/.fnm`,
    npm_config_prefix: process.env.npm_config_prefix || `${process.env.HOME}/.npm-global`,
  },
};

const useTotalUsage = (
  refreshInterval: number = 30000,
): {
  data: { inputTokens: number; outputTokens: number; totalTokens: number; cost: number } | null;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
} => {
  const npxCommand = preferences.customNpxPath || "npx";
  const {
    data: rawData,
    isLoading,
    error,
    revalidate,
  } = useExec(npxCommand, ["ccusage@latest", "--json"], execOptions);

  let data: { inputTokens: number; outputTokens: number; totalTokens: number; cost: number } | null = null;

  if (rawData && !error) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = JSON.parse(rawData) as any;

      if (parsed.totals) {
        data = {
          inputTokens: parsed.totals.inputTokens || 0,
          outputTokens: parsed.totals.outputTokens || 0,
          totalTokens: parsed.totals.totalTokens || 0,
          cost: parsed.totals.totalCost || 0,
        };
      }
    } catch (parseError) {
      console.error("Failed to parse total usage:", parseError);
    }
  }

  useInterval(() => {
    revalidate();
  }, refreshInterval);

  return { data, isLoading, error, revalidate };
};

const useDailyUsage = (
  refreshInterval: number = 10000,
): { data: DailyUsageData | null; isLoading: boolean; error: Error | undefined; revalidate: () => void } => {
  const npxCommand = preferences.customNpxPath || "npx";
  const {
    data: rawData,
    isLoading,
    error,
    revalidate,
  } = useExec(npxCommand, ["ccusage@latest", "daily", "--json"], execOptions);

  let data: DailyUsageData | null = null;

  if (rawData && !error) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = JSON.parse(rawData) as any;
      const today = new Date().toISOString().split("T")[0];

      if (parsed.daily && parsed.daily.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const todayEntry = parsed.daily.find((d: any) => d.date === today);
        if (todayEntry) {
          data = {
            ...todayEntry,
            cost: todayEntry.totalCost || todayEntry.cost || 0,
          };
        } else {
          const latest = parsed.daily[parsed.daily.length - 1];
          data = {
            ...latest,
            cost: latest.totalCost || latest.cost || 0,
          };
        }
      }
    } catch (parseError) {
      console.error("Failed to parse daily usage:", parseError);
    }
  }

  useInterval(() => {
    revalidate();
  }, refreshInterval);

  return { data, isLoading, error, revalidate };
};

const useSessionUsage = (
  refreshInterval: number = 15000,
): { data: SessionData[]; isLoading: boolean; error: Error | undefined; revalidate: () => void } => {
  const npxCommand = preferences.customNpxPath || "npx";
  const {
    data: rawData,
    isLoading,
    error,
    revalidate,
  } = useExec(npxCommand, ["ccusage@latest", "session", "--json"], execOptions);

  let data: SessionData[] = [];

  if (rawData && !error) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = JSON.parse(rawData) as any;
      const sessions = parsed.sessions || [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data = sessions.map((session: any) => {
        // Extract model from modelBreakdowns (ccusage actual structure)
        const primaryModel = session.modelBreakdowns?.[0]?.modelName || session.modelsUsed?.[0] || "unknown";

        // Use sessionId as project name directly
        const projectName = session.sessionId || "Unknown Project";

        return {
          ...session,
          cost: session.totalCost || session.cost || 0,
          startTime: session.lastActivity,
          model: primaryModel,
          projectName: projectName,
        };
      });
    } catch (parseError) {
      console.error("Failed to parse session usage:", parseError);
    }
  }

  useInterval(() => {
    revalidate();
  }, refreshInterval);

  return { data, isLoading, error, revalidate };
};

export function useUsageStats(refreshInterval: number = 5000): UsageStats & { revalidate: () => void } {
  const totalUsage = useTotalUsage(refreshInterval);
  const dailyUsage = useDailyUsage(refreshInterval);
  const sessionUsage = useSessionUsage(refreshInterval);

  const stats: UsageStats = {
    todayUsage: dailyUsage.data,
    totalUsage: totalUsage.data,
    recentSessions: sessionUsage.data ? getRecentSessions(sessionUsage.data, 5) : [],
    topModels: sessionUsage.data ? calculateModelUsage(sessionUsage.data) : [],
    isLoading: totalUsage.isLoading || dailyUsage.isLoading || sessionUsage.isLoading,
    error: totalUsage.error?.message || dailyUsage.error?.message || sessionUsage.error?.message,
  };

  return {
    ...stats,
    revalidate: () => {
      totalUsage.revalidate();
      dailyUsage.revalidate();
      sessionUsage.revalidate();
    },
  };
}

export function useCcusageAvailability() {
  const npxCommand = preferences.customNpxPath || "npx";
  const {
    data: rawData,
    isLoading,
    error,
    revalidate,
  } = useExec(npxCommand, ["ccusage@latest", "--help"], execOptions);

  return {
    isAvailable: !error && rawData !== undefined,
    isLoading,
    error,
    revalidate,
  };
}
