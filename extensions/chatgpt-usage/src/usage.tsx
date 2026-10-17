import {
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { useUsage } from "./hooks/use-usage";
import {
  dashboardUrl,
  DisplayMode,
  formatProgressBar,
  formatReset,
  formatUpdated,
  menuBarTitle,
  resetPassed,
  UsageWindow,
} from "./lib/usage";

function windowColor(window: UsageWindow, now: number) {
  if (resetPassed(window, now)) return Color.SecondaryText;
  if (window.remainingPercent <= 10) return Color.Red;
  if (window.remainingPercent <= 25) return Color.Orange;
  return Color.Green;
}

function WindowItem({ window, now }: { window: UsageWindow; now: number }) {
  const expired = resetPassed(window, now);
  const percent = expired ? "Awaiting refresh" : `${window.remainingPercent}% left`;
  const bar = expired ? "" : `${formatProgressBar(window.remainingPercent)} · `;
  const resetDate = window.resetsAt ? new Date(window.resetsAt * 1000).toLocaleString() : "Unknown";
  return (
    <MenuBarExtra.Item
      title={`${window.label} · ${percent}`}
      subtitle={`${bar}${formatReset(window.resetsAt, now)}`}
      icon={{ source: Icon.Gauge, tintColor: windowColor(window, now) }}
      tooltip={`Resets: ${resetDate}\n${expired ? "Refresh to confirm the new allowance." : `${window.usedPercent}% used`}`}
      onAction={() => open(dashboardUrl)}
    />
  );
}

export default function Command() {
  const preferences = getPreferenceValues<{ codexPath?: string; displayMode?: DisplayMode; hideDialIcon?: boolean }>();
  const { data, error, isLoading, revalidate, now, stale } = useUsage();
  const title = menuBarTitle(data, preferences.displayMode ?? "both", stale, now);
  const icon = error && !data ? Icon.ExclamationMark : preferences.hideDialIcon && title ? undefined : Icon.Gauge;
  const hasExpiredWindow = data?.windows.some((window) => resetPassed(window, now));
  const remaining = data?.windows
    .filter((window) => !resetPassed(window, now))
    .map((window) => window.remainingPercent);
  const lowest = remaining?.length ? Math.min(...remaining) : 100;
  const tintColor =
    stale || hasExpiredWindow
      ? Color.Orange
      : lowest <= 10
        ? Color.Red
        : lowest <= 25
          ? Color.Orange
          : Color.PrimaryText;
  const tooltip = data
    ? [
        "ChatGPT shared plan usage",
        ...data.windows.map(
          (window) =>
            `${window.label}: ${resetPassed(window, now) ? "awaiting refresh" : `${window.remainingPercent}% left`} · ${formatReset(window.resetsAt, now)}`,
        ),
        `${formatUpdated(data.fetchedAt, now)}${stale ? " (last known usage)" : ""}`,
      ].join("\n")
    : (error?.message ?? "Loading ChatGPT plan usage…");

  return (
    <MenuBarExtra
      icon={icon ? { source: icon, tintColor } : undefined}
      title={title}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title={data?.planType ? `ChatGPT · ${data.planType}` : "ChatGPT Plan Limits"}>
        {data?.windows.map((window) => (
          <WindowItem key={window.id} window={window} now={now} />
        ))}
        {data?.windows.length === 0 && <MenuBarExtra.Item title="No fixed plan limits reported" />}
        {!data && !error && <MenuBarExtra.Item title="Loading usage…" />}
        {error && <MenuBarExtra.Item title="Couldn't refresh usage" subtitle={error.message} tooltip={error.message} />}
        {data && (
          <MenuBarExtra.Item
            title={`${formatUpdated(data.fetchedAt, now)}${stale ? " · last known usage" : ""}`}
            tooltip={new Date(data.fetchedAt).toLocaleString()}
          />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="View Plan Usage"
          icon={Icon.AppWindow}
          onAction={() => launchCommand({ name: "view-usage", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Refresh Usage"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
        <MenuBarExtra.Item title="Open Usage Dashboard" icon={Icon.Globe} onAction={() => open(dashboardUrl)} />
        <MenuBarExtra.Item
          title="Extension Preferences…"
          icon={Icon.Gear}
          onAction={() => openExtensionPreferences()}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Shared across Codex, Work, Workspace Agents & Excel">
        <MenuBarExtra.Item title="Chat conversations aren't included" />
        <MenuBarExtra.Item title="Automatically refreshes every 5 minutes" />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
