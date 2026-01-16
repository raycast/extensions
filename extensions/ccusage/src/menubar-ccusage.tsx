import { MenuBarExtra, Icon, Color, open, openExtensionPreferences } from "@raycast/api";
import { useDailyUsage } from "./hooks/useDailyUsage";
import { useMonthlyUsage } from "./hooks/useMonthlyUsage";
import { useTotalUsage } from "./hooks/useTotalUsage";
import { formatCost, formatTokensAsMTok } from "./utils/data-formatter";
import { TotalUsageData } from "./types/usage-types";

export default function MenuBarccusage() {
  const { data: todayUsage, isLoading: dailyLoading, error: dailyError } = useDailyUsage();
  const { data: monthlyUsage, isLoading: monthlyLoading, error: monthlyError } = useMonthlyUsage();
  const { data: totalUsage, isLoading: totalLoading, error: totalError } = useTotalUsage();

  const hasError = dailyError || monthlyError || totalError;
  const isLoading = dailyLoading || monthlyLoading || totalLoading;

  if (isLoading) {
    return (
      <MenuBarExtra
        icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
        tooltip="Loading Claude usage..."
        isLoading={true}
      />
    );
  }

  const getTooltip = (): string => {
    if (hasError) {
      return "Error loading Claude usage data";
    }
    if (isLoading) {
      return "Loading Claude usage...";
    }
    if (!todayUsage) {
      return "No Claude usage data available";
    }
    return `Today: ${formatCost(todayUsage.totalCost)} • ${formatTokensAsMTok(todayUsage.totalTokens)}`;
  };

  const formatUsageTitle = (isLoading: boolean, usage: TotalUsageData | undefined, fallbackText: string): string => {
    if (isLoading) {
      return "Loading...";
    }
    if (usage) {
      const cost = usage.totalCost ?? 0;
      const tokens = usage.totalTokens ?? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
      return `${formatCost(cost)} • ${formatTokensAsMTok(tokens)}`;
    }
    return fallbackText;
  };

  return (
    <MenuBarExtra icon={{ source: "extension-icon.png" }} tooltip={getTooltip()}>
      {hasError && (
        <MenuBarExtra.Section title="Error">
          <MenuBarExtra.Item
            title={typeof hasError === "string" ? hasError : hasError.message}
            subtitle="ccusage command failed"
            icon={Icon.ExclamationMark}
            onAction={openExtensionPreferences}
          />
          <MenuBarExtra.Item
            title="Open Preferences"
            subtitle="Configure custom npx path"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
          <MenuBarExtra.Item
            title="Learn more about ccusage"
            subtitle="Open GitHub repository"
            icon={Icon.Code}
            onAction={() => open("https://github.com/ryoppippi/ccusage")}
          />
        </MenuBarExtra.Section>
      )}

      {!hasError && (
        <>
          <MenuBarExtra.Section title="Today's Usage">
            <MenuBarExtra.Item
              title={formatUsageTitle(dailyLoading, todayUsage, "No usage data available")}
              icon={Icon.Calendar}
              onAction={() => open("raycast://extensions/nyatinte/ccusage/ccusage")}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Monthly Usage">
            <MenuBarExtra.Item
              title={formatUsageTitle(monthlyLoading, monthlyUsage, "No usage data available")}
              icon={Icon.BarChart}
              onAction={() => open("raycast://extensions/nyatinte/ccusage/ccusage")}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Total Usage">
            <MenuBarExtra.Item
              title={formatUsageTitle(totalLoading, totalUsage, "No usage data available")}
              icon={Icon.Coins}
              onAction={() => open("raycast://extensions/nyatinte/ccusage/ccusage")}
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
