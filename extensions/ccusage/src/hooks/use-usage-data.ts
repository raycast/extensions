import { useExec } from "@raycast/utils";
import {
  DailyUsageData,
  MonthlyUsageData,
  SessionData,
  ModelUsage,
  TotalUsageData,
  TotalUsageResponseSchema,
  DailyUsageResponseSchema,
  MonthlyUsageResponseSchema,
  SessionUsageResponseSchema,
} from "../types/usage-types";
import { getRecentSessions, calculateModelUsage } from "../utils/usage-calculator";
import { preferences } from "../preferences";
import { getEnhancedNodePaths } from "../utils/node-path-resolver";

type UsageStats = {
  todayUsage: DailyUsageData | undefined;
  monthlyUsage: MonthlyUsageData | undefined;
  totalUsage: TotalUsageData | undefined;
  recentSessions: SessionData[];
  topModels: ModelUsage[];
  isLoading: boolean;
  error?: string;
};

const getExecOptions = () => ({
  env: {
    ...process.env,
    PATH: getEnhancedNodePaths(),
    NVM_DIR: process.env.NVM_DIR || `${process.env.HOME}/.nvm`,
    FNM_DIR: process.env.FNM_DIR || `${process.env.HOME}/.fnm`,
    npm_config_prefix: process.env.npm_config_prefix || `${process.env.HOME}/.npm-global`,
  },
  timeout: 30000,
  cwd: process.env.HOME,
});

const useTotalUsage = () => {
  const npxCommand = preferences.customNpxPath || "npx";

  return useExec<TotalUsageData>(npxCommand, ["ccusage@latest", "--json"], {
    ...getExecOptions(),
    parseOutput: ({ stdout }) => {
      if (!stdout) {
        throw new Error("No output received from ccusage command");
      }

      try {
        const jsonData = JSON.parse(stdout.toString());
        const parseResult = TotalUsageResponseSchema.safeParse(jsonData);

        if (!parseResult.success) {
          throw new Error(`Invalid total usage data format: ${parseResult.error.message}`);
        }

        return {
          inputTokens: parseResult.data.totals.inputTokens,
          outputTokens: parseResult.data.totals.outputTokens,
          cacheCreationTokens: parseResult.data.totals.cacheCreationTokens,
          cacheReadTokens: parseResult.data.totals.cacheReadTokens,
          totalTokens: parseResult.data.totals.totalTokens,
          totalCost: parseResult.data.totals.totalCost,
          cost: parseResult.data.totals.totalCost,
        };
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error(`Failed to parse JSON response: ${error.message}`);
        }
        throw error;
      }
    },
    keepPreviousData: true,
    failureToastOptions: {
      title: "Failed to fetch total usage data",
      primaryAction: {
        title: "Retry",
        onAction: (toast) => {
          toast.hide();
        },
      },
    },
  });
};

const useDailyUsage = () => {
  const npxCommand = preferences.customNpxPath || "npx";

  return useExec<DailyUsageData>(npxCommand, ["ccusage@latest", "daily", "--json"], {
    ...getExecOptions(),
    parseOutput: ({ stdout }) => {
      if (!stdout) {
        throw new Error("No output received from ccusage daily command");
      }

      try {
        const jsonData = JSON.parse(stdout.toString());
        const parseResult = DailyUsageResponseSchema.safeParse(jsonData);

        if (!parseResult.success) {
          throw new Error(`Invalid daily usage data format: ${parseResult.error.message}`);
        }

        if (parseResult.data.daily.length === 0) {
          throw new Error("No daily usage data available");
        }

        const today = new Date().toISOString().split("T")[0];
        const todayEntry = parseResult.data.daily.find((entry) => entry.date === today);

        if (todayEntry) {
          return {
            ...todayEntry,
            cost: todayEntry.totalCost,
          };
        }

        const latest = parseResult.data.daily[parseResult.data.daily.length - 1];
        return {
          ...latest,
          cost: latest.totalCost,
        };
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error(`Failed to parse JSON response: ${error.message}`);
        }
        throw error;
      }
    },
    keepPreviousData: true,
    failureToastOptions: {
      title: "Failed to fetch daily usage data",
      primaryAction: {
        title: "Retry",
        onAction: (toast) => {
          toast.hide();
        },
      },
    },
  });
};

const useMonthlyUsage = () => {
  const npxCommand = preferences.customNpxPath || "npx";

  return useExec<MonthlyUsageData>(npxCommand, ["ccusage@latest", "monthly", "--json"], {
    ...getExecOptions(),
    parseOutput: ({ stdout }) => {
      if (!stdout) {
        throw new Error("No output received from ccusage monthly command");
      }

      try {
        const jsonData = JSON.parse(stdout.toString());
        const parseResult = MonthlyUsageResponseSchema.safeParse(jsonData);

        if (!parseResult.success) {
          throw new Error(`Invalid monthly usage data format: ${parseResult.error.message}`);
        }

        if (parseResult.data.monthly.length === 0) {
          throw new Error("No monthly usage data available");
        }

        const currentMonth = new Date().toISOString().slice(0, 7);
        const currentMonthEntry = parseResult.data.monthly.find((entry) => entry.month === currentMonth);

        if (currentMonthEntry) {
          return {
            ...currentMonthEntry,
            cost: currentMonthEntry.totalCost,
          };
        }

        const latest = parseResult.data.monthly[parseResult.data.monthly.length - 1];
        return {
          ...latest,
          cost: latest.totalCost,
        };
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error(`Failed to parse JSON response: ${error.message}`);
        }
        throw error;
      }
    },
    keepPreviousData: true,
    failureToastOptions: {
      title: "Failed to fetch monthly usage data",
      primaryAction: {
        title: "Retry",
        onAction: (toast) => {
          toast.hide();
        },
      },
    },
  });
};

const useSessionUsage = () => {
  const npxCommand = preferences.customNpxPath || "npx";

  return useExec<SessionData[]>(npxCommand, ["ccusage@latest", "session", "--json"], {
    ...getExecOptions(),
    parseOutput: ({ stdout }) => {
      if (!stdout) return [];

      try {
        const jsonData = JSON.parse(stdout.toString());
        const parseResult = SessionUsageResponseSchema.safeParse(jsonData);

        if (!parseResult.success) {
          throw new Error(`Invalid session usage data format: ${parseResult.error.message}`);
        }

        return parseResult.data.sessions.map((session) => {
          const primaryModel = session.modelBreakdowns?.[0]?.modelName || session.modelsUsed?.[0] || "unknown";
          const projectName = session.sessionId || "Unknown Project";

          return {
            ...session,
            cost: session.totalCost,
            startTime: session.lastActivity,
            model: primaryModel,
            projectName: projectName,
          };
        });
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error(`Failed to parse JSON response: ${error.message}`);
        }
        throw error;
      }
    },
    keepPreviousData: true,
    failureToastOptions: {
      title: "Failed to fetch session usage data",
      primaryAction: {
        title: "Retry",
        onAction: (toast) => {
          toast.hide();
        },
      },
    },
  });
};

export const useUsageStats = (): UsageStats & { revalidate: () => void } => {
  const totalUsageHook = useTotalUsage();
  const dailyUsageHook = useDailyUsage();
  const monthlyUsageHook = useMonthlyUsage();
  const sessionUsageHook = useSessionUsage();

  const isLoading =
    totalUsageHook.isLoading || dailyUsageHook.isLoading || monthlyUsageHook.isLoading || sessionUsageHook.isLoading;
  const error = totalUsageHook.error || dailyUsageHook.error || monthlyUsageHook.error || sessionUsageHook.error;

  const recentSessions = getRecentSessions(sessionUsageHook.data || [], 5);
  const topModels = calculateModelUsage(sessionUsageHook.data || []);

  const stats: UsageStats = {
    todayUsage: dailyUsageHook.data,
    monthlyUsage: monthlyUsageHook.data,
    totalUsage: totalUsageHook.data,
    recentSessions,
    topModels,
    isLoading,
    error: error?.message,
  };

  return {
    ...stats,
    revalidate: () => {
      totalUsageHook.revalidate();
      dailyUsageHook.revalidate();
      monthlyUsageHook.revalidate();
      sessionUsageHook.revalidate();
    },
  };
};

export const useCcusageAvailability = () => {
  const npxCommand = preferences.customNpxPath || "npx";

  const { data, isLoading, error, revalidate } = useExec<boolean>(npxCommand, ["ccusage@latest", "--help"], {
    ...getExecOptions(),
    parseOutput: () => true, // If command succeeds, ccusage is available
    keepPreviousData: true,
    failureToastOptions: {
      title: "Failed to check ccusage availability",
      message: "ccusage command is not available. Please check installation.",
    },
  });

  return {
    isAvailable: data === true && !error,
    isLoading,
    error,
    revalidate,
  };
};
