import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  environment,
  Icon,
  launchCommand,
  LaunchType,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { historyStore, prepare } from "./runtime";
import { trackingScope } from "./preferences";
import { inactivity, notifications } from "./inactivity";
import { scopeLabel } from "./tracking";

export default function Settings() {
  const [paused, setPaused] = useState(false),
    [error, setError] = useState<string>(),
    [last, setLast] = useState("Not recorded yet"),
    [loading, setLoading] = useState(true);
  async function refresh() {
    try {
      await prepare();
      const [value, coverage] = await Promise.all([
        historyStore.meta("paused"),
        historyStore.coverage(0),
      ]);
      setPaused(value === "true");
      setLast(
        coverage.last
          ? new Date(coverage.last * 1000).toLocaleString()
          : "Not recorded yet",
      );
      setError(undefined);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function toggle() {
    try {
      // Drop the old baseline when resuming so paused time is never counted.
      await historyStore.run([
        {
          sql: "INSERT OR REPLACE INTO meta VALUES ('paused',?)",
          params: [String(!paused)],
        },
        { sql: "DELETE FROM meta WHERE key='previous'" },
        { sql: "UPDATE inactivity_control SET revision=revision+1 WHERE id=1" },
      ]);
      if (paused)
        await launchCommand({ name: "record", type: LaunchType.Background });
      await notifications("reconcile");
      await refresh();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not change recording",
        message: String(e),
      });
    }
  }
  async function clear() {
    if (
      !(await confirmAlert({
        title: "Clear recorded history?",
        message:
          "Deletes this extension’s measurements and pauses recording. macOS diagnostic reports are kept.",
        primaryAction: {
          title: "Clear and Pause",
          style: Alert.ActionStyle.Destructive,
        },
      }))
    )
      return;
    try {
      await historyStore.clear();
      await inactivity("clear-results");
      await notifications("reconcile");
      await refresh();
      await showToast({
        style: Toast.Style.Success,
        title: "History cleared; recording paused",
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not clear history",
        message: String(e),
      });
    }
  }
  return (
    <Detail
      isLoading={loading}
      markdown={`# Resource Inspector\n\n**Collection: ${paused ? "Paused" : "Enabled"}**\n\n**Tracking: ${scopeLabel[trackingScope()]}**\n\nChange Tracking Scope below to include Apple apps, or include all resources. The same scope applies to live lists, new recordings, history, and diagnostics. Overall memory pressure and swap still describe the whole Mac.\n\nExisting history is retained until normal expiry. Older entries without a reliable identity and mixed memory reports are visible only under All Resources; process names alone cannot identify macOS components.\n\nLatest recorded sample: ${last}\n\n${error ? `History error: ${error}\n\n` : ""}Collection uses Raycast’s background refresh, approximately once per minute while Raycast is running. Raycast’s scheduling switch is independent of the collection switch here. If samples stop updating, run Record Resource Usage and check its Background Refresh setting in Raycast.\n\nLive views refresh every five seconds even when recording is paused. Samples are local: detailed data for approximately 24 hours, hourly summaries up to seven days. Nothing is uploaded. Sleep, recording gaps, and unavailable measurements are not filled in.\n\nOnly one selected target can be closed. Optional inactivity notifications have an explicit Force Quit button; clicking it immediately terminates the named target without another confirmation. Manage Inactivity Alerts to select programs and enable notifications.\n\nLocal data folder: ${environment.supportPath}`}
      actions={
        <ActionPanel>
          <Action
            title={paused ? "Resume Recording" : "Pause Recording"}
            icon={paused ? Icon.Play : Icon.Pause}
            onAction={toggle}
          />
          <Action
            title="Record a Sample Now"
            icon={Icon.Clock}
            onAction={() =>
              launchCommand({ name: "record", type: LaunchType.UserInitiated })
            }
          />
          <Action
            title="Manage Inactivity Alerts"
            icon={Icon.Bell}
            onAction={() =>
              launchCommand({
                name: "inactive",
                type: LaunchType.UserInitiated,
              })
            }
          />
          <Action
            title="Change Tracking Scope"
            icon={Icon.Gear}
            onAction={openCommandPreferences}
          />
          <Action
            title="Refresh Status"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
          />
          <Action.ShowInFinder path={environment.supportPath} />
          <ActionPanel.Section title="History">
            <Action
              title="Clear History and Pause Recording"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={clear}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
