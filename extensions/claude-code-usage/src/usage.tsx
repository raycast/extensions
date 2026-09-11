import {
  Cache,
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  environment,
  getPreferenceValues,
  launchCommand,
  open,
  showHUD,
} from "@raycast/api";
import { useState } from "react";
import { useClaudeUsage } from "./hooks/useClaudeUsage";
import { getCachedUsage } from "./services/cache";
import { PrimaryMetric, TitleMode } from "./types";
import { CACHE_NAMESPACE_MENU_BAR, SETTINGS_URL } from "./utils/constants";
import {
  formatMoney,
  formatPercent,
  formatPlan,
  formatProgressBar,
  formatResetTime,
  formatSpend,
} from "./utils/formatters";
import { getClaudeMenuBarIcon, getClaudeUsageIcon } from "./utils/icons";

const prefsCache = new Cache({ namespace: CACHE_NAMESPACE_MENU_BAR });

const TITLE_MODES: Record<
  TitleMode,
  { icon: boolean; label: "percent" | "full" | "short" | null }
> = {
  "icon-percent": { icon: true, label: "percent" },
  "icon-full": { icon: true, label: "full" },
  "icon-short": { icon: true, label: "short" },
  percent: { icon: false, label: "percent" },
  full: { icon: false, label: "full" },
  short: { icon: false, label: "short" },
  icon: { icon: true, label: null },
};

type MetricTarget = {
  percent: number;
  title: (kind: "percent" | "full" | "short" | null) => string | undefined;
  tooltip: string;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences.Usage>();
  const refreshInterval = preferences.refreshInterval ?? "2";

  const [trackedMetric, setTrackedMetric] = useState<PrimaryMetric>(
    () => (prefsCache.get("trackedMetric") as PrimaryMetric) || "smart",
  );
  const [displayStyle, setDisplayStyle] = useState<TitleMode>(
    () => (prefsCache.get("displayStyle") as TitleMode) || "icon-percent",
  );

  const intervalMs = Math.max(1, Number(refreshInterval) || 2) * 60_000;
  const cached = getCachedUsage();
  const isStale = !cached || Date.now() - cached.fetchedAt >= intervalMs;
  const shouldFetch =
    environment.launchType === LaunchType.Background ? isStale : !cached;
  const { data, isLoading, hasTokens, refresh } = useClaudeUsage(shouldFetch);

  if (hasTokens === false) {
    return (
      <MenuBarExtra
        icon={{ source: getClaudeMenuBarIcon(), tintColor: Color.PrimaryText }}
        title="Connect Claude"
        tooltip="Connect your Claude account"
      >
        <MenuBarExtra.Item
          icon={Icon.Person}
          title="Sign in with Claude…"
          onAction={async () => {
            await launchCommand({
              name: "usage-details",
              type: LaunchType.UserInitiated,
              context: { autoSignIn: true },
            });
          }}
        />
      </MenuBarExtra>
    );
  }

  const spend = data?.spend ?? null;
  const rateLimits = data?.rateLimits;
  const fiveHour = rateLimits?.fiveHour ?? null;
  const sevenDay = rateLimits?.sevenDay ?? null;
  const sevenDaySonnet = rateLimits?.sevenDaySonnet ?? null;
  const hasRateLimits = Boolean(fiveHour || sevenDay || sevenDaySonnet);

  const effectiveDisplayStyle: TitleMode =
    !spend && (displayStyle === "icon-full" || displayStyle === "icon-short")
      ? "icon-percent"
      : !spend && (displayStyle === "full" || displayStyle === "short")
        ? "percent"
        : displayStyle;

  const spendTarget: MetricTarget | null = spend
    ? {
        percent: spend.percent,
        title: (kind) => {
          switch (kind) {
            case "percent":
              return formatPercent(spend.percent);
            case "full":
              return formatSpend(spend, true);
            case "short":
              return formatMoney(spend.usedAmount, spend.currency, true);
            default:
              return undefined;
          }
        },
        tooltip: `Claude Code Extra Usage: ${formatSpend(spend)} (${formatPercent(spend.percent)})${spend.resetsAt ? ` · ${formatResetTime(spend.resetsAt)}` : ""}`,
      }
    : null;

  const sessionTarget: MetricTarget | null = fiveHour
    ? {
        percent: fiveHour.utilization,
        title: (kind) =>
          kind !== null ? formatPercent(fiveHour.utilization) : undefined,
        tooltip: `Claude Code Session (5h): ${formatPercent(fiveHour.utilization)} used${fiveHour.resetsAt ? ` · ${formatResetTime(fiveHour.resetsAt)}` : ""}`,
      }
    : null;

  const weeklyTarget: MetricTarget | null = sevenDay
    ? {
        percent: sevenDay.utilization,
        title: (kind) =>
          kind !== null ? formatPercent(sevenDay.utilization) : undefined,
        tooltip: `Claude Code Weekly (All Models): ${formatPercent(sevenDay.utilization)} used${sevenDay.resetsAt ? ` · ${formatResetTime(sevenDay.resetsAt)}` : ""}`,
      }
    : null;

  const weeklySonnetTarget: MetricTarget | null = sevenDaySonnet
    ? {
        percent: sevenDaySonnet.utilization,
        title: (kind) =>
          kind !== null ? formatPercent(sevenDaySonnet.utilization) : undefined,
        tooltip: `Claude Code Weekly (Sonnet): ${formatPercent(sevenDaySonnet.utilization)} used${sevenDaySonnet.resetsAt ? ` · ${formatResetTime(sevenDaySonnet.resetsAt)}` : ""}`,
      }
    : null;

  const selectTarget = (): MetricTarget => {
    if (trackedMetric === "session" && sessionTarget) return sessionTarget;
    if (trackedMetric === "weekly" && weeklyTarget) return weeklyTarget;
    if (trackedMetric === "weekly-sonnet" && weeklySonnetTarget)
      return weeklySonnetTarget;
    if (trackedMetric === "spend" && spendTarget) return spendTarget;

    const candidates = [
      sessionTarget,
      weeklyTarget,
      weeklySonnetTarget,
      spendTarget,
    ].filter((item): item is MetricTarget => item !== null);

    if (candidates.length === 0) {
      return {
        percent: 0,
        title: () => undefined,
        tooltip: "Claude Code Usage",
      };
    }

    return candidates.reduce(
      (max, curr) => (curr.percent > max.percent ? curr : max),
      candidates[0],
    );
  };

  const target = selectTarget();
  const mode =
    TITLE_MODES[effectiveDisplayStyle] || TITLE_MODES["icon-percent"];
  const icon = mode.icon
    ? {
        source: getClaudeMenuBarIcon(data ? target.percent / 100 : 0),
        tintColor: Color.PrimaryText,
      }
    : undefined;

  const title = data ? target.title(mode.label) : undefined;
  const tooltip = data ? target.tooltip : "Claude Code Usage";

  const selectMetric = (metric: PrimaryMetric) => {
    prefsCache.set("trackedMetric", metric);
    setTrackedMetric(metric);
  };

  const selectDisplayStyle = (style: TitleMode) => {
    prefsCache.set("displayStyle", style);
    setDisplayStyle(style);
  };

  const rateLimitsSection = hasRateLimits ? (
    <MenuBarExtra.Section title="Session & Rate Limits">
      {fiveHour ? (
        <MenuBarExtra.Item
          icon={getClaudeUsageIcon(fiveHour.utilization / 100)}
          title={`Current Session (5h) · ${formatPercent(fiveHour.utilization)}${fiveHour.resetsAt ? ` · ${formatResetTime(fiveHour.resetsAt)}` : ""}\n${formatProgressBar(fiveHour.utilization, 16)}`}
          subtitle=" "
          onAction={async () => {
            await launchCommand({
              name: "usage-details",
              type: LaunchType.UserInitiated,
            });
          }}
        />
      ) : null}
      {sevenDay ? (
        <MenuBarExtra.Item
          icon={getClaudeUsageIcon(sevenDay.utilization / 100)}
          title={`Weekly Limit (All Models) · ${formatPercent(sevenDay.utilization)}${sevenDay.resetsAt ? ` · ${formatResetTime(sevenDay.resetsAt)}` : ""}\n${formatProgressBar(sevenDay.utilization, 16)}`}
          subtitle=" "
          onAction={async () => {
            await launchCommand({
              name: "usage-details",
              type: LaunchType.UserInitiated,
            });
          }}
        />
      ) : null}
      {sevenDaySonnet ? (
        <MenuBarExtra.Item
          icon={getClaudeUsageIcon(sevenDaySonnet.utilization / 100)}
          title={`Weekly Limit (Sonnet) · ${formatPercent(sevenDaySonnet.utilization)}${sevenDaySonnet.resetsAt ? ` · ${formatResetTime(sevenDaySonnet.resetsAt)}` : ""}\n${formatProgressBar(sevenDaySonnet.utilization, 16)}`}
          subtitle=" "
          onAction={async () => {
            await launchCommand({
              name: "usage-details",
              type: LaunchType.UserInitiated,
            });
          }}
        />
      ) : null}
    </MenuBarExtra.Section>
  ) : null;

  const extraUsageSection = spend ? (
    <MenuBarExtra.Section title="Extra Usage">
      <MenuBarExtra.Item
        icon={getClaudeUsageIcon(spend.percent / 100)}
        title={`${formatSpend(spend)} · ${formatPercent(spend.percent)}${spend.resetsAt ? ` · ${formatResetTime(spend.resetsAt)}` : ""}\n${formatProgressBar(spend.percent, 16)}`}
        subtitle=" "
        onAction={async () => {
          await launchCommand({
            name: "usage-details",
            type: LaunchType.UserInitiated,
          });
        }}
      />
    </MenuBarExtra.Section>
  ) : null;

  const prioritizeSpend = trackedMetric === "spend";

  return (
    <MenuBarExtra
      icon={icon}
      title={title}
      isLoading={isLoading}
      tooltip={tooltip}
    >
      {prioritizeSpend ? (
        <>
          {extraUsageSection}
          {rateLimitsSection}
        </>
      ) : (
        <>
          {rateLimitsSection}
          {extraUsageSection}
        </>
      )}

      {!hasRateLimits && !spend ? (
        <MenuBarExtra.Section title="Usage">
          <MenuBarExtra.Item
            icon={getClaudeUsageIcon(0)}
            title="No Usage Data Available"
            onAction={async () => {
              await launchCommand({
                name: "usage-details",
                type: LaunchType.UserInitiated,
              });
            }}
          />
        </MenuBarExtra.Section>
      ) : null}

      {data ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Submenu title="Tracked Metric" icon={Icon.Gauge}>
            <MenuBarExtra.Item
              title="Smart (Highest %)"
              subtitle={trackedMetric === "smart" ? "✓" : undefined}
              onAction={() => selectMetric("smart")}
            />
            {fiveHour ? (
              <MenuBarExtra.Item
                title="Current Session (5h)"
                subtitle={trackedMetric === "session" ? "✓" : undefined}
                onAction={() => selectMetric("session")}
              />
            ) : null}
            {sevenDay ? (
              <MenuBarExtra.Item
                title="Weekly Limit (All Models)"
                subtitle={trackedMetric === "weekly" ? "✓" : undefined}
                onAction={() => selectMetric("weekly")}
              />
            ) : null}
            {sevenDaySonnet ? (
              <MenuBarExtra.Item
                title="Weekly Limit (Sonnet)"
                subtitle={trackedMetric === "weekly-sonnet" ? "✓" : undefined}
                onAction={() => selectMetric("weekly-sonnet")}
              />
            ) : null}
            {spend ? (
              <MenuBarExtra.Item
                title="Extra Usage (Spend)"
                subtitle={trackedMetric === "spend" ? "✓" : undefined}
                onAction={() => selectMetric("spend")}
              />
            ) : null}
          </MenuBarExtra.Submenu>

          <MenuBarExtra.Submenu title="Display Style" icon={Icon.Eye}>
            <MenuBarExtra.Item
              icon={{
                source: getClaudeMenuBarIcon(target.percent / 100),
                tintColor: Color.PrimaryText,
              }}
              title={formatPercent(target.percent)}
              subtitle={
                effectiveDisplayStyle === "icon-percent" ? "✓" : undefined
              }
              onAction={() => selectDisplayStyle("icon-percent")}
            />
            {spend ? (
              <>
                <MenuBarExtra.Item
                  icon={{
                    source: getClaudeMenuBarIcon(target.percent / 100),
                    tintColor: Color.PrimaryText,
                  }}
                  title={formatSpend(spend, true)}
                  subtitle={
                    effectiveDisplayStyle === "icon-full" ? "✓" : undefined
                  }
                  onAction={() => selectDisplayStyle("icon-full")}
                />
                <MenuBarExtra.Item
                  icon={{
                    source: getClaudeMenuBarIcon(target.percent / 100),
                    tintColor: Color.PrimaryText,
                  }}
                  title={formatMoney(spend.usedAmount, spend.currency, true)}
                  subtitle={
                    effectiveDisplayStyle === "icon-short" ? "✓" : undefined
                  }
                  onAction={() => selectDisplayStyle("icon-short")}
                />
              </>
            ) : null}
            <MenuBarExtra.Item
              title={formatPercent(target.percent)}
              subtitle={effectiveDisplayStyle === "percent" ? "✓" : undefined}
              onAction={() => selectDisplayStyle("percent")}
            />
            {spend ? (
              <>
                <MenuBarExtra.Item
                  title={formatSpend(spend, true)}
                  subtitle={effectiveDisplayStyle === "full" ? "✓" : undefined}
                  onAction={() => selectDisplayStyle("full")}
                />
                <MenuBarExtra.Item
                  title={formatMoney(spend.usedAmount, spend.currency, true)}
                  subtitle={effectiveDisplayStyle === "short" ? "✓" : undefined}
                  onAction={() => selectDisplayStyle("short")}
                />
              </>
            ) : null}
            <MenuBarExtra.Item
              icon={{
                source: getClaudeMenuBarIcon(target.percent / 100),
                tintColor: Color.PrimaryText,
              }}
              title=""
              subtitle={effectiveDisplayStyle === "icon" ? "✓" : undefined}
              onAction={() => selectDisplayStyle("icon")}
            />
          </MenuBarExtra.Submenu>
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.ArrowClockwise}
          title="Refresh Usage"
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={async () => {
            const success = await refresh();
            await showHUD(
              success ? "Usage refreshed" : "Could not refresh usage",
            );
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.Globe}
          title="Open Usage Settings"
          onAction={() => open(SETTINGS_URL)}
        />
      </MenuBarExtra.Section>

      {data ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={`Updated ${new Date(data.fetchedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}${data.plan ? ` · ${formatPlan(data.plan)}` : ""}`}
          />
        </MenuBarExtra.Section>
      ) : null}
    </MenuBarExtra>
  );
}
