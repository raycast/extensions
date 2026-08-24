import {
  MenuBarExtra,
  Icon,
  launchCommand,
  LaunchType,
  Color,
  environment,
  openCommandPreferences,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getTodayStats,
  isClaudeActive,
  formatCost,
  UsageStats,
} from "./lib/usage-stats";
import { getMostRecentProject } from "./lib/project-discovery";
import { shortcut } from "./lib/shortcuts";
import { loadClaudeSubscriptionUsage } from "./lib/claude-subscription";
import type { SubscriptionUsageResult } from "./lib/subscription-usage";

export default function MenuBarMonitor() {
  const [isLoading, setIsLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [todayStats, setTodayStats] = useState<UsageStats | null>(null);
  const [recentProject, setRecentProject] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionUsageResult>();
  const [error, setError] = useState<string | null>(null);
  const preferences = getPreferenceValues<Preferences.MenuBarMonitor>();

  async function refresh() {
    try {
      const isBackground = environment.launchType === LaunchType.Background;

      // Cheap signals always: process check + LocalStorage-cached today stats.
      // Skip the full-history "last project" scan on background ticks; only run
      // it when the user actually opens the menu.
      const fetches: Promise<unknown>[] = [isClaudeActive(), getTodayStats()];
      const subscriptionIndex = preferences.subscriptionUsageOAuthToken
        ? fetches.push(loadClaudeSubscriptionUsage().catch(() => undefined)) - 1
        : -1;
      if (!isBackground) {
        fetches.push(getMostRecentProject());
      }

      const results = await Promise.all(fetches);
      setIsActive(results[0] as boolean);
      setTodayStats(results[1] as UsageStats);
      if (subscriptionIndex >= 0) {
        setSubscription(
          results[subscriptionIndex] as SubscriptionUsageResult | undefined,
        );
      }
      if (!isBackground) {
        const recent = results.at(-1) as { name?: string } | null;
        setRecentProject(recent?.name || null);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown Error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const getIcon = () => {
    if (error) {
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    }
    return "command-icon.png";
  };

  const getTitle = () => {
    if (isLoading) return undefined;
    if (
      preferences.showCostInMenuBar &&
      todayStats &&
      todayStats.totalCost > 0
    ) {
      return formatCost(todayStats.totalCost);
    }
    return undefined;
  };

  const tooltip = isActive
    ? "Claude Code Is Running"
    : `Today: ${todayStats?.totalSessions || 0} Sessions`;

  return (
    <MenuBarExtra
      icon={getIcon()}
      title={getTitle()}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      {/* Status Section */}
      <MenuBarExtra.Section title="Status">
        <MenuBarExtra.Item
          title={isActive ? "Claude Code Is Running" : "Idle"}
          icon={
            isActive
              ? { source: Icon.CircleFilled, tintColor: Color.Green }
              : Icon.Circle
          }
        />
        {recentProject && (
          <MenuBarExtra.Item
            title={`Last Project: ${recentProject}`}
            icon={Icon.Folder}
          />
        )}
      </MenuBarExtra.Section>

      {subscription?.usage ? (
        <MenuBarExtra.Section title="Subscription Limits">
          {subscription.usage.fiveHour ? (
            <MenuBarExtra.Item
              title={`Five-Hour Usage: ${formatUsagePercent(subscription.usage.fiveHour.usedPercent)}`}
              icon={Icon.Clock}
            />
          ) : null}
          {subscription.usage.weekly ? (
            <MenuBarExtra.Item
              title={`Weekly Usage: ${formatUsagePercent(subscription.usage.weekly.usedPercent)}`}
              icon={Icon.Gauge}
            />
          ) : null}
          {subscription.stale ? (
            <MenuBarExtra.Item title="Data Status: Stale" icon={Icon.Warning} />
          ) : null}
        </MenuBarExtra.Section>
      ) : null}

      {/* Today's Stats */}
      <MenuBarExtra.Section title="Today">
        <MenuBarExtra.Item
          title={`Sessions: ${todayStats?.totalSessions || 0}`}
          icon={Icon.Message}
        />
        <MenuBarExtra.Item
          title={`Cost: ${formatCost(todayStats?.totalCost || 0)}`}
          icon={Icon.Coins}
        />
      </MenuBarExtra.Section>

      {/* Quick Actions */}
      <MenuBarExtra.Section title="Quick Actions">
        <MenuBarExtra.Item
          title="Manage Agents"
          icon={Icon.Person}
          onAction={() => {
            launchCommand({
              name: "manage-agents",
              type: LaunchType.UserInitiated,
            });
          }}
        />
        <MenuBarExtra.Item
          title="Manage Worktrees"
          icon={Icon.Tree}
          onAction={() => {
            launchCommand({
              name: "manage-worktrees",
              type: LaunchType.UserInitiated,
            });
          }}
        />
        <MenuBarExtra.Item
          title="Ask Claude Code"
          icon={Icon.Message}
          shortcut={shortcut.primaryShift("c")}
          onAction={() => {
            launchCommand({
              name: "ask-claude",
              type: LaunchType.UserInitiated,
            });
          }}
        />
        <MenuBarExtra.Item
          title="Quick Continue"
          icon={Icon.ArrowRight}
          shortcut={shortcut.primaryAlt("r")}
          onAction={() => {
            launchCommand({
              name: "quick-continue",
              type: LaunchType.UserInitiated,
            });
          }}
        />
        <MenuBarExtra.Item
          title="Browse Sessions"
          icon={Icon.List}
          shortcut={shortcut.primaryAlt("s")}
          onAction={() => {
            launchCommand({
              name: "browse-sessions",
              type: LaunchType.UserInitiated,
            });
          }}
        />
        <MenuBarExtra.Item
          title="Launch Project"
          icon={Icon.Folder}
          shortcut={shortcut.primaryAlt("l")}
          onAction={() => {
            launchCommand({
              name: "launch-project",
              type: LaunchType.UserInitiated,
            });
          }}
        />
      </MenuBarExtra.Section>

      {/* More */}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="View Usage Dashboard"
          icon={Icon.BarChart}
          onAction={() => {
            launchCommand({
              name: "usage-dashboard",
              type: LaunchType.UserInitiated,
            });
          }}
        />
        <MenuBarExtra.Item
          title="Preferences..."
          icon={Icon.Gear}
          shortcut={shortcut.primary(",")}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function formatUsagePercent(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}% Used`;
}
