import { MenuBarExtra, Icon, Color, open, openExtensionPreferences } from "@raycast/api";
import { useCcusageAvailability, useUsageStats } from "./hooks/use-usage-data";
import { formatCost, formatTokensAsMTok } from "./utils/data-formatter";

export default function MenuBarccusage() {
  // Check ccusage availability
  const { isAvailable, isLoading: availabilityLoading, error: availabilityError } = useCcusageAvailability();

  // Use the existing hooks for data fetching (render-time only)
  const { todayUsage, monthlyUsage, totalUsage, isLoading: statsLoading, error: statsError } = useUsageStats();

  const hasError = availabilityError || statsError;
  const isLoading = availabilityLoading || statsLoading;

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
    if (hasError) {
      return "Error loading Claude usage data";
    }
    if (isLoading) {
      return "Loading Claude usage...";
    }
    if (!todayUsage) {
      return "No Claude usage data available";
    }
    return `Today: ${formatCost(todayUsage.cost)} • ${formatTokensAsMTok(todayUsage.totalTokens)}`;
  };

  return (
    <MenuBarExtra icon={getMenuBarIcon()} tooltip={getTooltip()}>
      {hasError && (
        <MenuBarExtra.Section title="Error">
          <MenuBarExtra.Item
            title={String(hasError)}
            subtitle="Check your ccusage installation"
            icon={Icon.ExclamationMark}
            onAction={openExtensionPreferences}
          />
        </MenuBarExtra.Section>
      )}

      {!hasError && (
        <>
          <MenuBarExtra.Section title="Today's Usage">
            <MenuBarExtra.Item
              title={
                isLoading
                  ? "Loading..."
                  : todayUsage
                    ? `${formatCost(todayUsage.cost)} • ${formatTokensAsMTok(todayUsage.totalTokens)}`
                    : "No usage data available"
              }
              icon={Icon.Calendar}
              onAction={() => open("raycast://extensions/nyatinte/ccusage/ccusage")}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Monthly Usage">
            <MenuBarExtra.Item
              title={
                isLoading
                  ? "Loading..."
                  : monthlyUsage
                    ? `${formatCost(monthlyUsage.cost)} • ${formatTokensAsMTok(monthlyUsage.totalTokens)}`
                    : "No usage data available"
              }
              icon={Icon.BarChart}
              onAction={() => open("raycast://extensions/nyatinte/ccusage/ccusage")}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Total Usage">
            <MenuBarExtra.Item
              title={
                isLoading
                  ? "Loading..."
                  : totalUsage
                    ? `${formatCost(totalUsage.cost)} • ${formatTokensAsMTok(totalUsage.totalTokens)}`
                    : "No usage data available"
              }
              icon={Icon.Coins}
              onAction={() => open("raycast://extensions/nyatinte/ccusage/ccusage")}
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
