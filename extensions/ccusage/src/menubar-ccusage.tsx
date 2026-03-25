import { MenuBarExtra, Icon, open, openCommandPreferences } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { useDailyUsage } from "./hooks/useDailyUsage";
import { useMonthlyUsage } from "./hooks/useMonthlyUsage";
import { useTotalUsage } from "./hooks/useTotalUsage";
import { useClaudeUsageLimits } from "./hooks/useClaudeUsageLimits";
import { useWorkingTime } from "./hooks/useWorkingTime";
import { formatCost, formatCostDelta, formatDuration, formatTokensAsMTok } from "./utils/data-formatter";
import { formatTimeRemaining, createProgressBar } from "./utils/usage-limits-formatter";
import { showRemainingUsage, getMenuBarTitle, getProgressBarStyle } from "./preferences";
import { TotalUsageData } from "./types/usage-types";

const MOCK_LIMITS_ENABLED = false;
const MOCK_LIMITS_DATA = {
  five_hour: { utilization: 28, resets_at: new Date(Date.now() + 23 * 60 * 1000).toISOString() },
  seven_day: {
    utilization: 61,
    resets_at: new Date(Date.now() + 6 * 24 * 3600 * 1000 + 2 * 3600 * 1000).toISOString(),
  },
  seven_day_sonnet: { utilization: 45, resets_at: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString() },
  seven_day_opus: { utilization: 82, resets_at: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString() },
};

export default function MenuBarccusage() {
  const [, forceRender] = useState(0);
  const { data: todayUsage, previousDayData, isLoading: dailyLoading, error: dailyError } = useDailyUsage();
  const { data: monthlyUsage, isLoading: monthlyLoading, error: monthlyError } = useMonthlyUsage();
  const { data: totalUsage, isLoading: totalLoading, error: totalError } = useTotalUsage();
  const {
    data: limitsData,
    error: limitsError,
    isLoading: limitsLoading,
    isRateLimited: limitsRateLimited,
    isUsageLimitsAvailable,
    rateLimitedUntil,
    nextRefreshAt,
    revalidate,
  } = useClaudeUsageLimits();
  const workingTime = useWorkingTime();
  const tickRef = useRef(() => forceRender((n) => n + 1));
  useEffect(() => {
    if (!limitsRateLimited && nextRefreshAt === null) return;
    const id = setInterval(tickRef.current, 1000);
    return () => clearInterval(id);
  }, [limitsRateLimited, nextRefreshAt]);

  const effectiveLimitsData = MOCK_LIMITS_ENABLED ? MOCK_LIMITS_DATA : limitsData;

  const hasData = todayUsage || monthlyUsage || totalUsage;
  const hasError = !hasData && (dailyError || monthlyError || totalError);
  const isLoading = dailyLoading || monthlyLoading || totalLoading;

  if (isLoading) {
    return <MenuBarExtra icon={{ source: Icon.Clock }} tooltip="Loading Claude usage..." isLoading={true} />;
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

  const preferRemaining = showRemainingUsage();
  const progressBarStyle = getProgressBarStyle();

  const rateLimitsSectionTitle = `Rate Limits · ${preferRemaining ? "Remaining" : "Consumed"}`;

  const limitInfo = (utilization: number, resetsAt: string | null): string => {
    const value = preferRemaining ? 100 - utilization : utilization;
    return `${value.toFixed(0)}%  ↻ ${resetsAt ? formatTimeRemaining(resetsAt) : "N/A"}`;
  };

  const limitBar = (utilization: number): string =>
    createProgressBar(preferRemaining ? 100 - utilization : utilization, 22, progressBarStyle);

  const limitTitle = (label: string, utilization: number): string => `${label.padEnd(6)}  ${limitBar(utilization)}`;

  const menuBarTitlePref = getMenuBarTitle();
  const highestUtilization = effectiveLimitsData
    ? Math.max(
        effectiveLimitsData.five_hour.utilization,
        effectiveLimitsData.seven_day.utilization,
        effectiveLimitsData.seven_day_sonnet?.utilization ?? 0,
        effectiveLimitsData.seven_day_opus?.utilization ?? 0,
      )
    : null;
  const menuBarTitle = (() => {
    if (menuBarTitlePref === "none") return undefined;
    if (menuBarTitlePref === "todayUsage")
      return todayUsage
        ? `${formatCost(todayUsage.totalCost)} · ${formatTokensAsMTok(todayUsage.totalTokens)}`
        : undefined;
    if (menuBarTitlePref === "todayCost") return todayUsage ? formatCost(todayUsage.totalCost) : undefined;
    if (menuBarTitlePref === "monthlyCost") return monthlyUsage ? formatCost(monthlyUsage.totalCost) : undefined;
    if (menuBarTitlePref === "todayTokens") return todayUsage ? formatTokensAsMTok(todayUsage.totalTokens) : undefined;
    if (menuBarTitlePref === "fiveHour")
      return effectiveLimitsData
        ? `${(preferRemaining ? 100 - effectiveLimitsData.five_hour.utilization : effectiveLimitsData.five_hour.utilization).toFixed(0)}%`
        : undefined;
    if (menuBarTitlePref === "sevenDay")
      return effectiveLimitsData
        ? `${(preferRemaining ? 100 - effectiveLimitsData.seven_day.utilization : effectiveLimitsData.seven_day.utilization).toFixed(0)}%`
        : undefined;
    if (menuBarTitlePref === "utilization")
      return highestUtilization !== null
        ? `${(preferRemaining ? 100 - highestUtilization : highestUtilization).toFixed(0)}%`
        : undefined;
    return todayUsage
      ? `${formatCost(todayUsage.totalCost)} · ${formatTokensAsMTok(todayUsage.totalTokens)}`
      : undefined;
  })();

  return (
    <MenuBarExtra icon={{ source: "extension-icon.png" }} title={menuBarTitle} tooltip={getTooltip()}>
      {hasError && (
        <MenuBarExtra.Section title="Error">
          <MenuBarExtra.Item
            title={typeof hasError === "string" ? hasError : hasError.message}
            subtitle="ccusage command failed"
            icon={Icon.ExclamationMark}
            onAction={openCommandPreferences}
          />
          <MenuBarExtra.Item
            title="Open Preferences"
            subtitle="Configure custom npx path"
            icon={Icon.Gear}
            onAction={openCommandPreferences}
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
          {isUsageLimitsAvailable && (
            <MenuBarExtra.Section title={rateLimitsSectionTitle}>
              {limitsRateLimited && !limitsData && (
                <MenuBarExtra.Item
                  title={`Rate limited — retry in ${rateLimitedUntil ? formatDuration(Math.max(0, rateLimitedUntil - Date.now())) : "…"}`}
                  icon={Icon.Clock}
                  onAction={revalidate}
                />
              )}
              {limitsError && !limitsData && !limitsRateLimited && (
                <MenuBarExtra.Item
                  title="Unable to fetch limits"
                  subtitle="Check Claude Code authentication"
                  icon={Icon.ExclamationMark}
                  onAction={() => open("raycast://extensions/nyatinte/ccusage/ccusage")}
                />
              )}
              {effectiveLimitsData && (
                <>
                  <MenuBarExtra.Item
                    title={limitTitle("5-Hour", effectiveLimitsData.five_hour.utilization)}
                    subtitle={limitInfo(
                      effectiveLimitsData.five_hour.utilization,
                      effectiveLimitsData.five_hour.resets_at,
                    )}
                    icon={Icon.Gauge}
                    onAction={revalidate}
                  />
                  <MenuBarExtra.Item
                    title={limitTitle("7-Day", effectiveLimitsData.seven_day.utilization)}
                    subtitle={limitInfo(
                      effectiveLimitsData.seven_day.utilization,
                      effectiveLimitsData.seven_day.resets_at,
                    )}
                    icon={Icon.Gauge}
                    onAction={revalidate}
                  />
                  {effectiveLimitsData.seven_day_sonnet && (
                    <MenuBarExtra.Item
                      title={limitTitle("Sonnet", effectiveLimitsData.seven_day_sonnet.utilization)}
                      subtitle={limitInfo(
                        effectiveLimitsData.seven_day_sonnet.utilization,
                        effectiveLimitsData.seven_day_sonnet.resets_at,
                      )}
                      icon={Icon.Gauge}
                      onAction={revalidate}
                    />
                  )}
                  {effectiveLimitsData.seven_day_opus && (
                    <MenuBarExtra.Item
                      title={limitTitle("Opus", effectiveLimitsData.seven_day_opus.utilization)}
                      subtitle={limitInfo(
                        effectiveLimitsData.seven_day_opus.utilization,
                        effectiveLimitsData.seven_day_opus.resets_at,
                      )}
                      icon={Icon.Gauge}
                      onAction={revalidate}
                    />
                  )}
                  {!limitsRateLimited && (
                    <MenuBarExtra.Item
                      title="Refresh"
                      subtitle={
                        nextRefreshAt ? `next in ${formatDuration(Math.max(0, nextRefreshAt - Date.now()))}` : undefined
                      }
                      icon={Icon.ArrowClockwise}
                      onAction={revalidate}
                    />
                  )}
                </>
              )}
              {!limitsData && !limitsError && limitsLoading && (
                <MenuBarExtra.Item title="Loading limits..." icon={Icon.Clock} />
              )}
            </MenuBarExtra.Section>
          )}

          <MenuBarExtra.Section title="Today's Usage">
            <MenuBarExtra.Item
              title={formatUsageTitle(dailyLoading, todayUsage, "No usage data available")}
              subtitle={
                todayUsage && previousDayData
                  ? `vs yesterday: ${formatCostDelta(todayUsage.totalCost, previousDayData.totalCost)}`
                  : undefined
              }
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

          <MenuBarExtra.Section title="Working Time">
            <MenuBarExtra.Item
              title={
                workingTime.isLoading
                  ? "Loading..."
                  : workingTime.todayMs > 0
                    ? formatDuration(workingTime.todayMs)
                    : "No activity today"
              }
              subtitle={
                workingTime.yesterdayMs > 0 ? `vs yesterday: ${formatDuration(workingTime.yesterdayMs)}` : undefined
              }
              icon={Icon.Clock}
              onAction={() => open("raycast://extensions/nyatinte/ccusage/ccusage")}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="Configure Command" icon={Icon.Gear} onAction={openCommandPreferences} />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
