import {
  Color,
  Icon,
  MenuBarExtra,
  launchCommand,
  LaunchType,
  openCommandPreferences,
  getPreferenceValues,
  open,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchRateLimits } from "./lib/anthropic-api";
import { getSubscriptionInfo } from "./lib/credentials";
import { getUsageTotals } from "./lib/session-parser";
import { fetchCodexUsage } from "./lib/codex-api";
import { getCodexPlanType } from "./lib/codex-credentials";
import {
  checkServiceAvailability,
  type ServiceAvailability,
} from "./lib/service-config";
import type {
  UsageApiResponse,
  RateLimitWindow,
  CodexUsageResponse,
} from "./lib/types";
import type { SubscriptionInfo } from "./lib/credentials";
import type { UsageTotals } from "./lib/session-parser";
import {
  formatTokenCount,
  formatCost,
  formatLineCount,
  formatResetCountdown,
  formatCodexPlanType,
  unixToIso,
  centsToDollars,
} from "./lib/formatting";

interface MenuBarData {
  availability: ServiceAvailability;
  rateLimits: UsageApiResponse | null;
  subscription: SubscriptionInfo;
  today: UsageTotals;
  month: UsageTotals;
  codex: CodexUsageResponse | null;
  codexPlanType: string;
}

const emptyTotals: UsageTotals = {
  totalTokens: 0,
  totalCost: 0,
  linesAdded: 0,
  linesRemoved: 0,
};

async function loadMenuBarData(): Promise<MenuBarData> {
  const availability = checkServiceAvailability();

  let subscription: SubscriptionInfo = {
    tierLabel: "Claude",
    subscriptionType: "",
    rateLimitTier: "",
  };
  let rateLimits: UsageApiResponse | null = null;
  let today: UsageTotals = emptyTotals;
  let month: UsageTotals = emptyTotals;

  if (availability.claude) {
    try {
      subscription = getSubscriptionInfo();
    } catch {
      // not authenticated yet
    }

    const [rl, t, m] = await Promise.all([
      fetchRateLimits(),
      getUsageTotals("today"),
      getUsageTotals("month"),
    ]);
    rateLimits = rl;
    today = t;
    month = m;
  }

  let codex: CodexUsageResponse | null = null;
  let codexPlanType = "";
  if (availability.codex) {
    try {
      codexPlanType = getCodexPlanType();
      codex = await fetchCodexUsage();
      if (!codexPlanType && codex.plan_type) {
        codexPlanType = codex.plan_type;
      }
    } catch {
      // Codex not configured — skip silently
    }
  }

  return {
    availability,
    rateLimits,
    subscription,
    today,
    month,
    codex,
    codexPlanType,
  };
}

const CLAUDE_ICON = { source: "claude-icon.png" };
const CODEX_ICON = { source: "codex-icon.png" };

const DARK_GREEN: Color.Dynamic = { light: "#1a7f37", dark: "#2ea043" };

function statusColor(utilization: number): Color | Color.Dynamic {
  const left = 100 - utilization;
  if (left <= 20) return Color.Red;
  if (left <= 60) return Color.Orange;
  return DARK_GREEN;
}

export default function MenuBar() {
  const { data, isLoading, error } = useCachedPromise(loadMenuBarData, [], {
    keepPreviousData: true,
  });

  const openDashboard = () =>
    launchCommand({ name: "token-watcher", type: LaunchType.UserInitiated });

  const prefs = getPreferenceValues<{ menuBarDisplay?: string }>();
  const showUsage = prefs.menuBarDisplay === "usage";

  // Title: show remaining/usage % for every enabled service
  // Each service prefixed with a Unicode symbol matching its brand
  let title = "⏳";
  let icon: MenuBarExtra.Props["icon"] = "icon.png";
  if (error && !data) {
    title = "⚠️";
  } else if (data) {
    if (!data.availability.anyConfigured) {
      title = "Setup";
      icon = Icon.Gear;
    } else {
      const parts: string[] = [];

      if (data.availability.claude) {
        if (data.rateLimits) {
          const used = data.rateLimits.five_hour.utilization;
          const display = showUsage ? used : Math.max(0, 100 - used);
          parts.push(`✦ ${display.toFixed(0)}%`);
        } else {
          parts.push("✦ --%");
        }
      }

      if (data.availability.codex) {
        if (data.codex?.rate_limit?.primary_window) {
          const used = data.codex.rate_limit.primary_window.used_percent;
          const display = showUsage ? used : Math.max(0, 100 - used);
          parts.push(`⬢ ${display.toFixed(0)}%`);
        } else {
          parts.push("⬢ --%");
        }
      }

      title = parts.join("  ");
    }
  }

  return (
    <MenuBarExtra
      icon={icon}
      title={title}
      isLoading={isLoading}
      tooltip="Token Watcher"
    >
      {error && !data ? (
        <MenuBarExtra.Section title="Error">
          <MenuBarExtra.Item
            title={
              error.message.includes("ENOENT")
                ? "Run `claude` to authenticate"
                : "Token expired or API error"
            }
            icon={Icon.ExclamationMark}
            onAction={() => openCommandPreferences()}
          />
        </MenuBarExtra.Section>
      ) : data && !data.availability.anyConfigured ? (
        <MenuBarExtra.Section title="Setup Required">
          <MenuBarExtra.Item
            title="Set up Claude Code"
            subtitle="~/.claude/.credentials.json"
            icon={CLAUDE_ICON}
            onAction={() =>
              open("https://docs.anthropic.com/en/docs/claude-code/overview")
            }
          />
          <MenuBarExtra.Item
            title="Set up Codex"
            subtitle="~/.codex/auth.json"
            icon={CODEX_ICON}
            onAction={() => open("https://codex.openai.com")}
          />
          <MenuBarExtra.Item
            title="Open Token Watcher"
            icon={Icon.List}
            onAction={openDashboard}
          />
        </MenuBarExtra.Section>
      ) : data ? (
        <>
          {/* Claude section */}
          {data.availability.claude && data.rateLimits && (
            <MenuBarExtra.Section
              title={`Claude · ${data.subscription.tierLabel}`}
            >
              <RateLimitRow
                label="Session"
                window={data.rateLimits.five_hour}
                onAction={openDashboard}
              />
              <RateLimitRow
                label="Weekly"
                window={data.rateLimits.seven_day}
                onAction={openDashboard}
              />
              {data.rateLimits.seven_day_sonnet && (
                <RateLimitRow
                  label="Sonnet"
                  window={data.rateLimits.seven_day_sonnet}
                  onAction={openDashboard}
                />
              )}
              {data.rateLimits.seven_day_opus && (
                <RateLimitRow
                  label="Opus"
                  window={data.rateLimits.seven_day_opus}
                  onAction={openDashboard}
                />
              )}
              {data.rateLimits.extra_usage?.is_enabled && (
                <MenuBarExtra.Item
                  icon={{
                    source: Icon.CircleFilled,
                    tintColor: Color.SecondaryText,
                  }}
                  title={`Extra  ${formatCost(centsToDollars(data.rateLimits.extra_usage.used_credits))} / ${formatCost(centsToDollars(data.rateLimits.extra_usage.monthly_limit))}`}
                  onAction={openDashboard}
                />
              )}
            </MenuBarExtra.Section>
          )}

          {/* Codex section */}
          {data.availability.codex && data.codex && (
            <MenuBarExtra.Section
              title={`Codex · ${formatCodexPlanType(data.codexPlanType)}`}
            >
              {data.codex.rate_limit?.primary_window && (
                <CodexWindowRow
                  label="Session"
                  usedPercent={
                    data.codex.rate_limit.primary_window.used_percent
                  }
                  resetAt={data.codex.rate_limit.primary_window.reset_at}
                  onAction={openDashboard}
                />
              )}
              {data.codex.rate_limit?.secondary_window && (
                <CodexWindowRow
                  label="Weekly"
                  usedPercent={
                    data.codex.rate_limit.secondary_window.used_percent
                  }
                  resetAt={data.codex.rate_limit.secondary_window.reset_at}
                  onAction={openDashboard}
                />
              )}
              {!data.codex.rate_limit?.primary_window &&
                !data.codex.rate_limit?.secondary_window && (
                  <MenuBarExtra.Item
                    title="No usage data"
                    icon={Icon.Info}
                    onAction={openDashboard}
                  />
                )}
              {data.codex.credits && !data.codex.credits.unlimited && (
                <MenuBarExtra.Item
                  icon={{
                    source: Icon.CircleFilled,
                    tintColor: Color.SecondaryText,
                  }}
                  title={`Credits  $${Number(data.codex.credits.balance ?? 0).toFixed(2)}`}
                  onAction={openDashboard}
                />
              )}
            </MenuBarExtra.Section>
          )}

          {/* Cost (Claude only) */}
          {data.availability.claude && (
            <MenuBarExtra.Section title="Cost">
              <MenuBarExtra.Item
                icon={Icon.Coins}
                title={`Today  ${formatCost(data.today.totalCost)}`}
                subtitle={`${formatTokenCount(data.today.totalTokens)} tokens`}
                onAction={openDashboard}
              />
              <MenuBarExtra.Item
                icon={Icon.Calendar}
                title={`30 Days  ${formatCost(data.month.totalCost)}`}
                subtitle={`${formatTokenCount(data.month.totalTokens)} tokens`}
                onAction={openDashboard}
              />
            </MenuBarExtra.Section>
          )}

          {/* Lines (Claude only) */}
          {data.availability.claude && (
            <MenuBarExtra.Section title="Lines">
              <MenuBarExtra.Item
                icon={Icon.Code}
                title={`Today  ${formatLineCount(data.today.linesAdded, data.today.linesRemoved)}`}
                onAction={openDashboard}
              />
              <MenuBarExtra.Item
                icon={Icon.Code}
                title={`30 Days  ${formatLineCount(data.month.linesAdded, data.month.linesRemoved)}`}
                onAction={openDashboard}
              />
            </MenuBarExtra.Section>
          )}
        </>
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Token Watcher"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={openDashboard}
        />
        <MenuBarExtra.Item
          title="Preferences..."
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={() => openCommandPreferences()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function RateLimitRow({
  label,
  window: w,
  onAction,
}: {
  label: string;
  window: RateLimitWindow;
  onAction: () => void;
}) {
  const left = Math.max(0, 100 - w.utilization);
  return (
    <MenuBarExtra.Item
      icon={{
        source: Icon.CircleFilled,
        tintColor: statusColor(w.utilization),
      }}
      title={`${label}  ${left.toFixed(0)}% left`}
      subtitle={`Resets in ${formatResetCountdown(w.resets_at)}`}
      onAction={onAction}
    />
  );
}

function CodexWindowRow({
  label,
  usedPercent,
  resetAt,
  onAction,
}: {
  label: string;
  usedPercent: number;
  resetAt: number;
  onAction: () => void;
}) {
  const left = Math.max(0, 100 - usedPercent);
  return (
    <MenuBarExtra.Item
      icon={{
        source: Icon.CircleFilled,
        tintColor: statusColor(usedPercent),
      }}
      title={`${label}  ${left.toFixed(0)}% left`}
      subtitle={`Resets in ${formatResetCountdown(unixToIso(resetAt))}`}
      onAction={onAction}
    />
  );
}
