import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { launchApp } from "../lib/control";
import type { Dashboard } from "../lib/dashboard";
import { openSettings } from "../lib/navigation";

type Unavailable = Extract<Dashboard, { kind: "unavailable" }>;

/**
 * One empty state for both causes of "no control socket": the app is closed, or
 * external control is off. Each renders exactly the action that fixes it.
 */
export function ConnectionError({ dashboard, onRetry }: { dashboard: Unavailable; onRetry: () => void }) {
  const notRunning = dashboard.reason === "not-running";

  return (
    <List>
      <List.EmptyView
        icon={notRunning ? Icon.AppWindow : Icon.Gear}
        title={notRunning ? "Proxy Manager isn't running" : "External control is off"}
        description={
          notRunning
            ? "Raycast talks to Proxy Manager over its local control socket, which exists while the app runs."
            : "In Proxy Manager open Settings → Integration and turn on “Allow external control” and “Apps and CLI”. Raycast asks for permission once."
        }
        actions={
          <ActionPanel>
            <Action
              title={notRunning ? "Open Proxy Manager" : "Open Settings"}
              icon={notRunning ? Icon.AppWindow : Icon.Gear}
              onAction={notRunning ? () => launchApp() : () => openSettings()}
            />
            <Action
              title="Check Again"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRetry}
            />
            <Action.CopyToClipboard title="Copy Error" content={dashboard.message} />
          </ActionPanel>
        }
      />
    </List>
  );
}
