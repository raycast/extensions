import { MenuBarExtra, Icon, Color, open, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useccusageAvailability } from "./hooks/use-usage-data";
import { formatCost, formatTokensAsMTok } from "./utils/data-formatter";
import { execSync } from "child_process";
import { cpus } from "os";

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

type UsageEntry = {
  date?: string;
  month?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost?: number;
  cost?: number;
};

type ParsedData = {
  daily?: UsageEntry[];
  monthly?: UsageEntry[];
  totals?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    totalCost: number;
  };
};

const processUsageData = (data: ParsedData, type: "daily" | "monthly" | "total"): UsageEntry | null => {
  if (type === "daily" && data.daily && data.daily.length > 0) {
    const today = new Date().toISOString().split("T")[0];
    const todayEntry = data.daily.find((d) => d.date === today);
    const entry = todayEntry || data.daily[data.daily.length - 1];
    return {
      ...entry,
      cost: entry.totalCost || entry.cost || 0,
    };
  }

  if (type === "monthly" && data.monthly && data.monthly.length > 0) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthEntry = data.monthly.find((m) => m.month === currentMonth);
    const entry = currentMonthEntry || data.monthly[data.monthly.length - 1];
    return {
      ...entry,
      cost: entry.totalCost || 0,
    };
  }

  if (type === "total" && data.totals) {
    return {
      inputTokens: data.totals.inputTokens || 0,
      outputTokens: data.totals.outputTokens || 0,
      totalTokens: data.totals.totalTokens || 0,
      cost: data.totals.totalCost || 0,
    };
  }

  return null;
};

export default function MenuBarccusage() {
  // Check ccusage availability
  const { isAvailable, isLoading: availabilityLoading } = useccusageAvailability();

  // Get usage data with usePromise (system-monitor style)
  const { data: usageData, isLoading: usageLoading } = usePromise(async () => {
    if (!isAvailable) return null;

    try {
      const enhancedPath = getEnhancedNodePaths();

      // Get daily, monthly, and total usage
      const [dailyResult, monthlyResult, totalResult] = await Promise.all([
        new Promise<string>((resolve, reject) => {
          try {
            const result = execSync("npx ccusage@latest daily --json", {
              env: { ...process.env, PATH: enhancedPath },
              encoding: "utf8",
              timeout: 30000,
            });
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }),
        new Promise<string>((resolve, reject) => {
          try {
            const result = execSync("npx ccusage@latest monthly --json", {
              env: { ...process.env, PATH: enhancedPath },
              encoding: "utf8",
              timeout: 30000,
            });
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }),
        new Promise<string>((resolve, reject) => {
          try {
            const result = execSync("npx ccusage@latest --json", {
              env: { ...process.env, PATH: enhancedPath },
              encoding: "utf8",
              timeout: 30000,
            });
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }),
      ]);

      // Parse and process results using common utility functions
      const dailyData = JSON.parse(dailyResult);
      const monthlyData = JSON.parse(monthlyResult);
      const totalData = JSON.parse(totalResult);

      const dailyUsage = processUsageData(dailyData, "daily");
      const monthlyUsage = processUsageData(monthlyData, "monthly");
      const totalUsage = processUsageData(totalData, "total");

      return { dailyUsage, monthlyUsage, totalUsage };
    } catch (error) {
      console.error("Failed to fetch usage data:", error);
      return null;
    }
  });

  const isLoading = availabilityLoading || usageLoading;

  if (isLoading) {
    return (
      <MenuBarExtra
        icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
        tooltip="Loading Claude usage..."
        isLoading={true}
      />
    );
  }

  if (!isAvailable) {
    return (
      <MenuBarExtra icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }} tooltip="ccusage is not available">
        <MenuBarExtra.Item
          title="ccusage is not available"
          subtitle="Please configure runtime and path in Preferences"
          icon={Icon.ExclamationMark}
          onAction={openExtensionPreferences}
        />
        <MenuBarExtra.Item
          title="Open Preferences"
          subtitle="Select JavaScript runtime (npx, pnpm, etc.)"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
        <MenuBarExtra.Item
          title="Learn more about ccusage"
          subtitle="Open GitHub repository"
          icon={Icon.Code}
          onAction={() => open("https://github.com/ryoppippi/ccusage")}
        />
      </MenuBarExtra>
    );
  }

  // Calculate menu bar icon based on daily usage
  const getMenuBarIcon = () => {
    return { source: "extension-icon.png" };
  };

  const getTooltip = (): string => {
    if (!usageData?.dailyUsage) {
      return "No Claude usage today";
    }
    return `Today: ${formatCost(usageData.dailyUsage.cost)} • ${formatTokensAsMTok(usageData.dailyUsage.totalTokens)}`;
  };

  return (
    <MenuBarExtra icon={getMenuBarIcon()} tooltip={getTooltip()}>
      <MenuBarExtra.Section title="Today's Usage">
        <MenuBarExtra.Item
          title={
            usageData?.dailyUsage
              ? `${formatCost(usageData.dailyUsage.cost)} • ${formatTokensAsMTok(usageData.dailyUsage.totalTokens)}`
              : "No usage today"
          }
          icon={Icon.Calendar}
          onAction={() => open("raycast://extensions/nyatinte/ccusage/ccusage")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Monthly Usage">
        <MenuBarExtra.Item
          title={
            usageData?.monthlyUsage
              ? `${formatCost(usageData.monthlyUsage.cost)} • ${formatTokensAsMTok(usageData.monthlyUsage.totalTokens)}`
              : "No usage this month"
          }
          icon={Icon.BarChart}
          onAction={() => open("raycast://extensions/nyatinte/ccusage/ccusage")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Total Usage">
        <MenuBarExtra.Item
          title={
            usageData?.totalUsage
              ? `${formatCost(usageData.totalUsage.cost)} • ${formatTokensAsMTok(usageData.totalUsage.totalTokens)}`
              : "No usage data"
          }
          icon={Icon.Coins}
          onAction={() => open("raycast://extensions/nyatinte/ccusage/ccusage")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
