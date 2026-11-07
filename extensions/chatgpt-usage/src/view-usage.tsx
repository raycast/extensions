import { Action, ActionPanel, Color, Detail, Icon, Keyboard, openExtensionPreferences } from "@raycast/api";
import { useUsage } from "./hooks/use-usage";
import { dashboardUrl, formatUpdated, resetPassed } from "./lib/usage";
import { usageMarkdown } from "./lib/usage-view";

export default function Command() {
  const { data, error, isLoading, revalidate, now, stale } = useUsage();
  const resetPending = data?.windows.some((window) => resetPassed(window, now));
  const status = isLoading
    ? data
      ? "Refreshing"
      : "Loading"
    : !data
      ? "Unavailable"
      : stale
        ? "Last known usage"
        : resetPending
          ? "Reset pending"
          : "Current";

  return (
    <Detail
      isLoading={isLoading}
      markdown={usageMarkdown(data, error?.message, stale, now)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Plan" text={data?.planType ?? "—"} />
          <Detail.Metadata.Label
            title="Status"
            text={{ value: status, color: stale || resetPending ? Color.Orange : Color.PrimaryText }}
          />
          <Detail.Metadata.Label
            title="Updated"
            text={data ? formatUpdated(data.fetchedAt, now).replace(/^Updated /, "") : "—"}
          />
          {data && <Detail.Metadata.Separator />}
          {data?.windows.map((window) => (
            <Detail.Metadata.Label
              key={window.id}
              title={window.label.replace(/ limit$/, " reset")}
              text={
                window.resetsAt
                  ? new Date(window.resetsAt * 1000).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Unavailable"
              }
            />
          ))}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Dashboard" text="Usage overview" target={dashboardUrl} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh Usage"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          <Action.OpenInBrowser title="Open Usage Dashboard" url={dashboardUrl} />
          <Action title="Extension Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
        </ActionPanel>
      }
    />
  );
}
