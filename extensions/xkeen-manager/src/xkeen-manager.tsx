import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { runRemote } from "./lib/ssh";
import { loadStartupData } from "./lib/health";
import { parseXkeenStatus } from "./lib/xkeenStatus";
import { getPaths, parseErrorMessage } from "./lib/utils";
import { QuickAddForm } from "./components/QuickAddForm";
import { JsonEditor } from "./components/JsonEditor";
import { ProfilesList } from "./components/ProfilesList";
import { HealthDetail } from "./components/HealthDetail";
import { IpDetail } from "./components/IpDetail";
import { LogsDetail, RestartDetail } from "./components/LogsDetail";
import { BackupsHub } from "./components/BackupsHub";

export default function XkeenManager() {
  const [hasPendingConfigChanges, setHasPendingConfigChanges] = useState(false);
  const { configDir } = getPaths();

  const { data, isLoading, error, revalidate } = useCachedPromise(loadStartupData, [], {
    keepPreviousData: true,
    onData: (result) => {
      if (parseXkeenStatus(result.statusRaw).isStopped) {
        void showToast({
          style: Toast.Style.Failure,
          title: "Xkeen is not running",
          message: `Last profile: ${result.activeProfile}`,
        });
      }
    },
  });

  const loadError = error ? parseErrorMessage(error) : "";
  const status = data?.statusRaw ?? "";
  const activeProfile = data?.activeProfile ?? "unknown";
  const optOk = data?.optMounted ?? false;
  const xkeenOk = data?.xkeenAvailable ?? false;

  const { isRunning, isStopped, mode } = parseXkeenStatus(status);

  const statusSubtitle = loadError ? "Connection error" : isRunning ? "Running" : "Stopped";
  const statusAccessories = isRunning
    ? [{ tag: { value: mode, color: Color.Green } }, { text: activeProfile }]
    : isStopped
      ? [{ tag: { value: "Stopped", color: Color.Red } }]
      : [];

  const healthAccessories = [
    { tag: { value: "OPT", color: optOk ? Color.Green : Color.Red } },
    { tag: { value: "XKEEN", color: xkeenOk ? Color.Green : Color.Red } },
  ];

  async function restart() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Restarting..." });
      await runRemote("xkeen -restart");
      await showToast({ style: Toast.Style.Success, title: "Restarted" });
      setHasPendingConfigChanges(false);
      revalidate();
    } catch (e) {
      await showFailureToast(e, { title: "Restart failed" });
    }
  }

  async function start() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Starting..." });
      await runRemote("xkeen -start");
      await showToast({ style: Toast.Style.Success, title: "Started" });
      setHasPendingConfigChanges(false);
      revalidate();
    } catch (e) {
      await showFailureToast(e, { title: "Start failed" });
    }
  }

  async function stop() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Stopping..." });
      await runRemote("xkeen -stop");
      await showToast({ style: Toast.Style.Success, title: "Stopped" });
      setHasPendingConfigChanges(false);
      revalidate();
    } catch (e) {
      await showFailureToast(e, { title: "Stop failed" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="xkeen…">
      <List.Section title="Xkeen">
        <List.Item
          title="Status"
          subtitle={statusSubtitle}
          icon={
            loadError
              ? { source: Icon.Warning, tintColor: Color.Orange }
              : { source: Icon.Heartbeat, tintColor: isRunning ? Color.Green : Color.Red }
          }
          accessories={!loadError ? statusAccessories : undefined}
          actions={
            <ActionPanel>
              <Action title="Refresh Status" icon={Icon.RotateClockwise} onAction={revalidate} />
              {loadError && <Action.CopyToClipboard title="Copy Error" content={loadError} />}
              {!isRunning && (
                <Action title="Start Client" icon={{ source: Icon.Play, tintColor: Color.Green }} onAction={start} />
              )}
              {isRunning && (
                <Action title="Stop Client" icon={{ source: Icon.Stop, tintColor: Color.Red }} onAction={stop} />
              )}
              <Action title="Restart Client" icon={Icon.RotateClockwise} onAction={restart} />
              <Action.Push title="Show Logs" icon={Icon.Text} target={<LogsDetail />} />
              <Action.Push title="IP Check" icon={Icon.Globe} target={<IpDetail />} />
              <Action.Push
                title="Outbounds Editor"
                icon={Icon.ArrowRight}
                target={
                  <JsonEditor
                    title="04_outbounds.json"
                    path={`${configDir}/04_outbounds.json`}
                    onAfterSave={(r) => {
                      revalidate();
                      setHasPendingConfigChanges(!r?.restarted);
                    }}
                  />
                }
              />
              <Action.Push
                title="Backups & Rollback"
                icon={Icon.Folder}
                target={
                  <BackupsHub
                    onAfterRestore={() => {
                      setHasPendingConfigChanges(false);
                      revalidate();
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Restart"
          subtitle={hasPendingConfigChanges ? "Changes saved, restart required" : "Restart the client"}
          icon={Icon.RotateClockwise}
          actions={
            <ActionPanel>
              <Action title="Restart Xkeen" style={Action.Style.Destructive} onAction={restart} />
              <Action.Push title="Restart (Show Output)" target={<RestartDetail onDone={revalidate} />} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Routing">
        <List.Item
          title="Quick Add"
          subtitle="Add domains to routing"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Quick Add"
                target={
                  <QuickAddForm
                    onAfterSave={() => {
                      setHasPendingConfigChanges(true);
                      revalidate();
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Routing Editor"
          subtitle="05_routing.json"
          icon={Icon.List}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Routing"
                target={
                  <JsonEditor
                    title="05_routing.json"
                    path={`${configDir}/05_routing.json`}
                    onAfterSave={(r) => {
                      revalidate();
                      setHasPendingConfigChanges(!r?.restarted);
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Manage">
        <List.Item
          title="Profiles"
          subtitle={activeProfile}
          icon={Icon.Switch}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Profiles"
                target={
                  <ProfilesList
                    onSwitched={() => {
                      setHasPendingConfigChanges(false);
                      revalidate();
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Health"
          icon={Icon.Shield}
          accessories={healthAccessories}
          actions={
            <ActionPanel>
              <Action.Push title="Open Health Check" target={<HealthDetail />} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
