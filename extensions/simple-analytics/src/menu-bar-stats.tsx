import {
  MenuBarExtra,
  open,
  openCommandPreferences,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useState } from "react";
import { fetchStats, getDashboardUrl } from "./lib/api";
import {
  getActiveWebsite,
  getWebsites,
  cycleToNextWebsite,
  getTimeRange,
  setTimeRange as saveTimeRange,
  setActiveWebsiteId,
} from "./lib/storage";
import { formatNumber, formatDuration, getTimeRangeLabel, truncatePath } from "./lib/format";
import { TimeRange, Website, StatsResponse } from "./lib/types";

const Icons = {
  chartBar: { source: "chart-bar.svg" },
  user: { source: "user.svg" },
  eye: { source: "eye.svg" },
  clock: { source: "clock.svg" },
  globe: { source: "globe.svg" },
  calendar: { source: "calendar.svg" },
  arrowRight: { source: "arrow-right.svg" },
  refresh: { source: "refresh.svg" },
  settings: { source: "settings.svg" },
  plus: { source: "plus.svg" },
  check: { source: "check.svg" },
  alertCircle: { source: "alert-circle.svg" },
};

async function loadInitialData() {
  const [websites, activeWebsite, timeRange] = await Promise.all([getWebsites(), getActiveWebsite(), getTimeRange()]);
  return { websites, activeWebsite, timeRange };
}

export default function MenuBarStats() {
  const preferences = getPreferenceValues<Preferences>();
  const [currentTimeRange, setCurrentTimeRange] = useState<TimeRange | null>(null);
  const [currentWebsite, setCurrentWebsite] = useState<Website | null>(null);

  const {
    data: initialData,
    isLoading: isLoadingInitial,
    revalidate: revalidateInitial,
  } = useCachedPromise(loadInitialData);

  const websites = initialData?.websites ?? [];
  const activeWebsite = currentWebsite ?? initialData?.activeWebsite ?? null;
  const timeRange = currentTimeRange ?? initialData?.timeRange ?? preferences.defaultTimeRange;

  const {
    data: stats,
    isLoading: isLoadingStats,
    error,
    revalidate: revalidateStats,
  } = useCachedPromise(
    async (website: Website | null, range: TimeRange) => {
      if (!website) return null;
      return fetchStats({
        domain: website.domain,
        apiKey: website.apiKey,
        timeRange: range,
      });
    },
    [activeWebsite, timeRange],
    {
      execute: !!activeWebsite,
      keepPreviousData: true, // Show cached data immediately
    }
  );

  const isLoading = isLoadingInitial || isLoadingStats;

  const handleCycleWebsite = useCallback(async () => {
    const nextWebsite = await cycleToNextWebsite();
    setCurrentWebsite(nextWebsite);
    await showHUD(`Switched to ${nextWebsite?.label || nextWebsite?.domain || "website"}`);
  }, []);

  const handleSetTimeRange = useCallback(async (range: TimeRange) => {
    await saveTimeRange(range);
    setCurrentTimeRange(range);
  }, []);

  const handleOpenDashboard = useCallback(() => {
    if (activeWebsite) {
      open(getDashboardUrl(activeWebsite.domain));
    }
  }, [activeWebsite]);

  const handleManageWebsites = useCallback(async () => {
    await launchCommand({ name: "manage-websites", type: LaunchType.UserInitiated });
  }, []);

  const handleSwitchWebsite = useCallback(async (website: Website) => {
    await setActiveWebsiteId(website.id);
    setCurrentWebsite(website);
  }, []);

  const handleRefresh = useCallback(() => {
    revalidateInitial();
    revalidateStats();
  }, [revalidateInitial, revalidateStats]);

  const title = buildMenuBarTitle(stats, preferences, isLoading, error, activeWebsite);
  const tooltip = buildTooltip(activeWebsite, timeRange, stats);

  if (!isLoadingInitial && websites.length === 0) {
    return (
      <MenuBarExtra icon={Icons.chartBar} title="Setup" tooltip="Click to add a website">
        <MenuBarExtra.Item title="No websites configured" />
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Add Website..."
            icon={Icons.plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={handleManageWebsites}
          />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  const showLoading = isLoading && !stats;

  return (
    <MenuBarExtra icon={Icons.chartBar} title={title} tooltip={tooltip} isLoading={showLoading}>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={activeWebsite?.label || activeWebsite?.domain || "No website"}
          subtitle={getTimeRangeLabel(timeRange)}
          onAction={handleOpenDashboard}
        />
      </MenuBarExtra.Section>

      {stats && (
        <>
          <MenuBarExtra.Section title="Statistics">
            <MenuBarExtra.Item
              title="Visitors"
              subtitle={formatNumber(stats.visitors)}
              icon={Icons.user}
              onAction={handleOpenDashboard}
            />
            <MenuBarExtra.Item
              title="Pageviews"
              subtitle={formatNumber(stats.pageviews)}
              icon={Icons.eye}
              onAction={handleOpenDashboard}
            />
            {stats.seconds_on_page !== undefined && (
              <MenuBarExtra.Item
                title="Avg. Time on Page"
                subtitle={formatDuration(stats.seconds_on_page)}
                icon={Icons.clock}
                onAction={handleOpenDashboard}
              />
            )}
          </MenuBarExtra.Section>

          {stats.pages && stats.pages.length > 0 && (
            <MenuBarExtra.Section title="Top Pages">
              {stats.pages.slice(0, 5).map((page, index) => (
                <MenuBarExtra.Item
                  key={index}
                  title={truncatePath(page.value)}
                  subtitle={`${formatNumber(page.pageviews)} views`}
                  onAction={() => open(`https://${activeWebsite?.domain}${page.value}`)}
                />
              ))}
            </MenuBarExtra.Section>
          )}

          {stats.referrers && stats.referrers.length > 0 && (
            <MenuBarExtra.Section title="Top Referrers">
              {stats.referrers.slice(0, 5).map((referrer, index) => (
                <MenuBarExtra.Item
                  key={index}
                  title={referrer.value || "Direct"}
                  subtitle={`${formatNumber(referrer.visitors)} visitors`}
                />
              ))}
            </MenuBarExtra.Section>
          )}
        </>
      )}

      {error && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Error loading stats" icon={Icons.alertCircle} />
          <MenuBarExtra.Item title={error.message} />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Submenu title="Time Range" icon={Icons.calendar}>
          <MenuBarExtra.Item
            title="Last 24 Hours"
            icon={timeRange === "today" ? Icons.check : undefined}
            onAction={() => handleSetTimeRange("today")}
          />
          <MenuBarExtra.Item
            title="Last 7 Days"
            icon={timeRange === "7d" ? Icons.check : undefined}
            onAction={() => handleSetTimeRange("7d")}
          />
          <MenuBarExtra.Item
            title="Last 30 Days"
            icon={timeRange === "30d" ? Icons.check : undefined}
            onAction={() => handleSetTimeRange("30d")}
          />
        </MenuBarExtra.Submenu>

        {websites.length > 1 && (
          <MenuBarExtra.Submenu title="Switch Website" icon={Icons.globe}>
            {websites.map((website) => (
              <MenuBarExtra.Item
                key={website.id}
                title={website.label || website.domain}
                icon={website.id === activeWebsite?.id ? Icons.check : undefined}
                onAction={() => handleSwitchWebsite(website)}
              />
            ))}
          </MenuBarExtra.Submenu>
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icons.refresh}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={handleRefresh}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Dashboard"
          icon={Icons.globe}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={handleOpenDashboard}
        />
        {websites.length > 1 && (
          <MenuBarExtra.Item
            title="Next Website"
            icon={Icons.arrowRight}
            shortcut={{ modifiers: ["cmd"], key: "." }}
            onAction={handleCycleWebsite}
          />
        )}
        <MenuBarExtra.Item
          title="Manage Websites..."
          icon={Icons.settings}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={handleManageWebsites}
        />
        <MenuBarExtra.Item title="Preferences..." icon={Icons.settings} onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function buildMenuBarTitle(
  stats: StatsResponse | null | undefined,
  preferences: Preferences,
  isLoading: boolean,
  error: Error | null | undefined,
  activeWebsite: Website | null
): string {
  if (!activeWebsite) {
    return "Setup";
  }

  if (isLoading && !stats) {
    return "...";
  }

  if (error) {
    return "!";
  }

  if (!stats) {
    return "--";
  }

  const visitors = formatNumber(stats.visitors);
  const pageviews = formatNumber(stats.pageviews);

  switch (preferences.displayMode) {
    case "visitors":
      return visitors;
    case "pageviews":
      return pageviews;
    case "both":
    default:
      return `${visitors} | ${pageviews}`;
  }
}

function buildTooltip(
  activeWebsite: Website | null,
  timeRange: TimeRange,
  stats: StatsResponse | null | undefined
): string {
  if (!activeWebsite) {
    return "Simple Analytics: Click to setup";
  }

  const siteName = activeWebsite.label || activeWebsite.domain;
  const rangeLabel = getTimeRangeLabel(timeRange);

  if (!stats) {
    return `${siteName}: ${rangeLabel}`;
  }

  return `${siteName}: ${rangeLabel}\n${stats.visitors} visitors, ${stats.pageviews} pageviews`;
}
