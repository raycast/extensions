import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { InstalledApp } from "../../utils/types";
import { IgnoreState } from "../../utils/ignored";
import { ScanResult } from "../../utils/coordinator";
import { openAppForSparkleUpdate } from "../../utils/sources/sparkle";
import { formatDuration } from "../../utils/format";

interface Props {
  scan: ScanResult;
  ignoreStates: IgnoreState[];
  onUnhide: (app: InstalledApp) => void;
  onRefresh: () => void;
  onForceRescan: () => void;
}

/** Shows snoozed apps with countdown + permanently hidden apps. Both can be restored with one click. */
export default function HiddenView({
  scan,
  ignoreStates,
  onUnhide,
  onRefresh,
  onForceRescan,
}: Props) {
  if (scan.ignoredApps.length === 0) {
    return (
      <List.EmptyView
        icon={{ source: Icon.Eye, tintColor: Color.Green }}
        title="No hidden or snoozed apps"
        description="Use ⌘⇧I to hide an app or ⌘⇧S to snooze. They show up here with one-click restore."
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.RotateClockwise}
              onAction={onRefresh}
            />
          </ActionPanel>
        }
      />
    );
  }

  const stateMap = new Map(ignoreStates.map((s) => [s.bundleId, s]));
  const snoozed = scan.ignoredApps.filter(
    (a) => stateMap.get(a.bundleId)?.snoozedUntil,
  );
  const hidden = scan.ignoredApps.filter(
    (a) => !stateMap.get(a.bundleId)?.snoozedUntil,
  );

  return (
    <>
      {snoozed.length > 0 && (
        <List.Section title="Snoozed" subtitle={`${snoozed.length}`}>
          {snoozed.map((app) => {
            const state = stateMap.get(app.bundleId);
            const remainingMs = (state?.snoozedUntil ?? 0) - Date.now();
            const label =
              remainingMs > 0
                ? `Resurfaces in ${formatDuration(remainingMs)}`
                : "Expires shortly";
            return (
              <List.Item
                key={app.appPath}
                icon={{ fileIcon: app.appPath }}
                title={app.name}
                subtitle={app.version}
                accessories={[
                  {
                    tag: { value: label, color: Color.Blue },
                    icon: Icon.Clock,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Wake Up Now"
                      icon={Icon.Eye}
                      onAction={() => onUnhide(app)}
                    />
                    <Action
                      title="Open App"
                      icon={Icon.AppWindow}
                      onAction={() => openAppForSparkleUpdate(app.appPath)}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.RotateClockwise}
                      onAction={onRefresh}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action
                      title="Force Rescan (Clear Cache)"
                      icon={Icon.RotateAntiClockwise}
                      onAction={onForceRescan}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      {hidden.length > 0 && (
        <List.Section title="Hidden Forever" subtitle={`${hidden.length}`}>
          {hidden.map((app) => (
            <List.Item
              key={app.appPath}
              icon={{ fileIcon: app.appPath }}
              title={app.name}
              subtitle={app.version}
              accessories={[
                {
                  icon: {
                    source: Icon.EyeDisabled,
                    tintColor: Color.SecondaryText,
                  },
                  tooltip: "Hidden forever",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Show This App Again"
                    icon={Icon.Eye}
                    onAction={() => onUnhide(app)}
                  />
                  <Action
                    title="Open App"
                    icon={Icon.AppWindow}
                    onAction={() => openAppForSparkleUpdate(app.appPath)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    onAction={onRefresh}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Force Rescan (Clear Cache)"
                    icon={Icon.RotateAntiClockwise}
                    onAction={onForceRescan}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Bundle ID"
                    content={app.bundleId}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </>
  );
}
