import { MenuBarExtra, Icon, open, openCommandPreferences } from "@raycast/api";
import type { Image } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { useDailyUsage } from "./hooks/useDailyUsage";
import { useWeeklyUsage } from "./hooks/useWeeklyUsage";
import { useMonthlyUsage } from "./hooks/useMonthlyUsage";
import { useTotalUsage } from "./hooks/useTotalUsage";
import { useClaudeUsageLimits } from "./hooks/useClaudeUsageLimits";
import { useWorkingTime } from "./hooks/useWorkingTime";
import { formatCost, formatCostDelta, formatDuration, formatTokensAsMTok } from "./utils/data-formatter";
import { formatTimeRemaining, createProgressBar } from "./utils/usage-limits-formatter";
import { pieIcon } from "./utils/pie-icon";
import { formatTimeRemainingCustom } from "./utils/time-remaining-formatter";
import { getLimitRows } from "./utils/limit-rows";
import {
  showRemainingUsage,
  getMenuBarTitle,
  getProgressBarStyle,
  getMenuBarIcon,
  getMenuBarIconStyle,
  getMenuBarTimeRemaining,
  getMenuBarTimeRemainingFormat,
  isSectionVisible,
} from "./preferences";
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
  limits: [
    {
      kind: "session",
      group: "session",
      percent: 28,
      resets_at: new Date(Date.now() + 23 * 60 * 1000).toISOString(),
      scope: null,
    },
    {
      kind: "weekly_all",
      group: "weekly",
      percent: 61,
      resets_at: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString(),
      scope: null,
    },
    {
      kind: "weekly_scoped",
      group: "weekly",
      percent: 15,
      resets_at: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString(),
      scope: { model: { id: null, display_name: "Fable" } },
    },
  ],
};

export default function MenuBarccusage() {
  const [, forceRender] = useState(0);
  const { data: todayUsage, previousDayData, isLoading: dailyLoading, error: dailyError } = useDailyUsage();
  const { data: weeklyUsage, previousWeekData, isLoading: weeklyLoading, error: weeklyError } = useWeeklyUsage();
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

  const sections = {
    rateLimits: isSectionVisible("sectionRateLimits"),
    todayUsage: isSectionVisible("sectionTodayUsage"),
    thisWeek: isSectionVisible("sectionThisWeek"),
    monthlyUsage: isSectionVisible("sectionMonthlyUsage"),
    totalUsage: isSectionVisible("sectionTotalUsage"),
    currentBlock: isSectionVisible("sectionCurrentBlock"),
    workingTime: isSectionVisible("sectionWorkingTime"),
  };

  // A hidden section's hook still runs (rules of hooks), but its loading/error
  // state shouldn't block sections the user actually chose to see.
  const hasData =
    (sections.todayUsage ? todayUsage : undefined) ||
    (sections.thisWeek ? weeklyUsage : undefined) ||
    (sections.monthlyUsage ? monthlyUsage : undefined) ||
    (sections.totalUsage ? totalUsage : undefined);
  const hasError =
    !hasData &&
    ((sections.todayUsage ? dailyError : undefined) ||
      (sections.thisWeek ? weeklyError : undefined) ||
      (sections.monthlyUsage ? monthlyError : undefined) ||
      (sections.totalUsage ? totalError : undefined));
  const isLoading =
    (sections.todayUsage && dailyLoading) ||
    (sections.monthlyUsage && monthlyLoading) ||
    (sections.totalUsage && totalLoading);

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
  const iconStyle = getMenuBarIconStyle();
  const showTimeRemaining = getMenuBarTimeRemaining();
  const timeRemainingFormat = getMenuBarTimeRemainingFormat();
  const usePies = progressBarStyle === "pies";

  const displayUtil = (utilization: number): number => (preferRemaining ? 100 - utilization : utilization);

  const rateLimitsSectionTitle = `Rate Limits · ${preferRemaining ? "Remaining" : "Consumed"}`;

  const limitInfo = (utilization: number, resetsAt: string | null): string =>
    `${displayUtil(utilization).toFixed(0)}%  ↻ ${resetsAt ? formatTimeRemaining(resetsAt) : "N/A"}`;

  const limitBar = (utilization: number): string => createProgressBar(displayUtil(utilization), 22, progressBarStyle);

  const limitRows = getLimitRows(effectiveLimitsData);

  /** Six holds the alignment the fixed-width labels had before per-model rows carried API names. */
  const labelWidth = Math.max(6, ...limitRows.map((row) => row.label.length));

  const limitTitle = (label: string, utilization: number): string =>
    usePies ? label : `${label.padEnd(labelWidth)}  ${limitBar(utilization)}`;

  /** When pies style is selected, use a pie SVG icon for each limit row; otherwise Icon.Gauge. */
  const limitIcon = (utilization: number): string | Icon => (usePies ? (pieIcon(utilization) as string) : Icon.Gauge);

  const menuBarTitlePref = getMenuBarTitle();
  const highestUtilization = limitRows.length > 0 ? Math.max(...limitRows.map((row) => row.utilization)) : null;
  const menuBarTitle = (() => {
    let title: string | undefined;
    if (menuBarTitlePref === "none") title = undefined;
    else if (menuBarTitlePref === "todayUsage")
      title = todayUsage
        ? `${formatCost(todayUsage.totalCost)} · ${formatTokensAsMTok(todayUsage.totalTokens)}`
        : undefined;
    else if (menuBarTitlePref === "todayCost") title = todayUsage ? formatCost(todayUsage.totalCost) : undefined;
    else if (menuBarTitlePref === "weeklyCost") title = weeklyUsage ? formatCost(weeklyUsage.totalCost) : undefined;
    else if (menuBarTitlePref === "monthlyCost") title = monthlyUsage ? formatCost(monthlyUsage.totalCost) : undefined;
    else if (menuBarTitlePref === "todayTokens")
      title = todayUsage ? formatTokensAsMTok(todayUsage.totalTokens) : undefined;
    else if (menuBarTitlePref === "fiveHour")
      title = effectiveLimitsData ? `${displayUtil(effectiveLimitsData.five_hour.utilization).toFixed(0)}%` : undefined;
    else if (menuBarTitlePref === "sevenDay")
      title = effectiveLimitsData ? `${displayUtil(effectiveLimitsData.seven_day.utilization).toFixed(0)}%` : undefined;
    else if (menuBarTitlePref === "utilization")
      title = highestUtilization !== null ? `${displayUtil(highestUtilization).toFixed(0)}%` : undefined;
    else if (menuBarTitlePref === "blockProjection") {
      const block = workingTime.activeBlock;
      title = block ? formatCost(block.projection?.totalCost ?? block.costUSD) : undefined;
    } else {
      title = todayUsage
        ? `${formatCost(todayUsage.totalCost)} · ${formatTokensAsMTok(todayUsage.totalTokens)}`
        : undefined;
    }

    // Append time remaining to the title when enabled
    if (showTimeRemaining && effectiveLimitsData) {
      const timeStr = formatTimeRemainingCustom(effectiveLimitsData.five_hour.resets_at, timeRemainingFormat);
      if (timeStr && title) title = `${title} · ${timeStr}`;
      else if (timeStr) title = timeStr;
    }

    return title;
  })();

  // Resolve the menu bar icon: use a pie chart SVG when that style is selected
  const menuBarIcon: Image.Source = (() => {
    if (iconStyle === "pie" && effectiveLimitsData) {
      return pieIcon(effectiveLimitsData.five_hour.utilization) as string;
    }
    return getMenuBarIcon();
  })();

  return (
    <MenuBarExtra icon={{ source: menuBarIcon }} title={menuBarTitle} tooltip={getTooltip()}>
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
          {sections.rateLimits && isUsageLimitsAvailable && (
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
                  onAction={() =>
                    open(`${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/nyatinte/ccusage/ccusage`)
                  }
                />
              )}
              {effectiveLimitsData && (
                <>
                  {limitRows.map((row) => (
                    <MenuBarExtra.Item
                      key={row.key}
                      title={limitTitle(row.label, row.utilization)}
                      subtitle={limitInfo(row.utilization, row.resets_at)}
                      icon={limitIcon(row.utilization)}
                      onAction={revalidate}
                    />
                  ))}
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
              {!limitsData && !limitsError && !limitsRateLimited && limitsLoading && (
                <MenuBarExtra.Item title="Loading limits..." icon={Icon.Clock} />
              )}
            </MenuBarExtra.Section>
          )}

          {sections.todayUsage && (
            <MenuBarExtra.Section title="Today's Usage">
              <MenuBarExtra.Item
                title={formatUsageTitle(dailyLoading, todayUsage, "No usage data available")}
                subtitle={
                  todayUsage && previousDayData
                    ? `vs yesterday: ${formatCostDelta(todayUsage.totalCost, previousDayData.totalCost)}`
                    : undefined
                }
                icon={Icon.Calendar}
                onAction={() =>
                  open(`${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/nyatinte/ccusage/ccusage`)
                }
              />
            </MenuBarExtra.Section>
          )}

          {sections.thisWeek && (
            <MenuBarExtra.Section title="This Week">
              <MenuBarExtra.Item
                title={formatUsageTitle(weeklyLoading, weeklyUsage, "No usage data available")}
                subtitle={
                  weeklyUsage && previousWeekData
                    ? `vs last week: ${formatCostDelta(weeklyUsage.totalCost, previousWeekData.totalCost)}`
                    : undefined
                }
                icon={Icon.Calendar}
                onAction={() =>
                  open(`${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/nyatinte/ccusage/ccusage`)
                }
              />
            </MenuBarExtra.Section>
          )}

          {sections.monthlyUsage && (
            <MenuBarExtra.Section title="Monthly Usage">
              <MenuBarExtra.Item
                title={formatUsageTitle(monthlyLoading, monthlyUsage, "No usage data available")}
                icon={Icon.BarChart}
                onAction={() =>
                  open(`${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/nyatinte/ccusage/ccusage`)
                }
              />
            </MenuBarExtra.Section>
          )}

          {sections.totalUsage && (
            <MenuBarExtra.Section title="Total Usage">
              <MenuBarExtra.Item
                title={formatUsageTitle(totalLoading, totalUsage, "No usage data available")}
                icon={Icon.Coins}
                onAction={() =>
                  open(`${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/nyatinte/ccusage/ccusage`)
                }
              />
            </MenuBarExtra.Section>
          )}

          {sections.currentBlock && workingTime.activeBlock && (
            <MenuBarExtra.Section title="Current Block">
              <MenuBarExtra.Item
                title={
                  workingTime.activeBlock.projection
                    ? `${formatCost(workingTime.activeBlock.projection.totalCost)} projected`
                    : formatCost(workingTime.activeBlock.costUSD)
                }
                subtitle={[
                  workingTime.activeBlock.burnRate
                    ? `${formatCost(workingTime.activeBlock.burnRate.costPerHour)}/hr`
                    : null,
                  `${formatCost(workingTime.activeBlock.costUSD)} so far`,
                  workingTime.activeBlock.projection
                    ? `${formatDuration(workingTime.activeBlock.projection.remainingMinutes * 60 * 1000)} left`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                icon={Icon.Gauge}
                onAction={() =>
                  open(`${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/nyatinte/ccusage/ccusage`)
                }
              />
            </MenuBarExtra.Section>
          )}

          {sections.workingTime && (
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
                onAction={() =>
                  open(`${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/nyatinte/ccusage/ccusage`)
                }
              />
            </MenuBarExtra.Section>
          )}

          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="Configure Command" icon={Icon.Gear} onAction={openCommandPreferences} />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
