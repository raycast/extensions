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

export default function MenuBarMonitor() {
  const [isLoading, setIsLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [todayStats, setTodayStats] = useState<UsageStats | null>(null);
  const [recentProject, setRecentProject] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const isBackground = environment.launchType === LaunchType.Background;

      // Cheap signals always: process check + LocalStorage-cached today stats.
      // Skip the full-history "last project" scan on background ticks; only run
      // it when the user actually opens the menu.
      const fetches: Promise<unknown>[] = [isClaudeActive(), getTodayStats()];
      if (!isBackground) {
        fetches.push(getMostRecentProject());
      }

      const results = await Promise.all(fetches);
      setIsActive(results[0] as boolean);
      setTodayStats(results[1] as UsageStats);
      if (!isBackground) {
        const recent = results[2] as { name?: string } | null;
        setRecentProject(recent?.name || null);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const preferences = getPreferenceValues<Preferences.MenuBarMonitor>();

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
    ? "Claude Code is running"
    : `Today: ${todayStats?.totalSessions || 0} sessions`;

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
          title={isActive ? "Claude Code is running" : "Idle"}
          icon={
            isActive
              ? { source: Icon.CircleFilled, tintColor: Color.Green }
              : Icon.Circle
          }
        />
        {recentProject && (
          <MenuBarExtra.Item
            title={`Last project: ${recentProject}`}
            icon={Icon.Folder}
          />
        )}
      </MenuBarExtra.Section>

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
          title="Ask Claude Code"
          icon={Icon.Message}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
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
          shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
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
          shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
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
          shortcut={{ modifiers: ["cmd", "opt"], key: "l" }}
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
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
