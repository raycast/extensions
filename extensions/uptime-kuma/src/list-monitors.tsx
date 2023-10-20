import { Action, ActionPanel, getPreferenceValues, Icon, Color, List } from "@raycast/api";
import { UptimeKuma, Monitor, Uptime, AvgPing, Heartbeat, HeartbeatList } from "./modules/UptimeKuma";
import { useEffect, useState } from "react";
import { MonitorDetail } from "./monitor-detail";
import { getHeartbeatListEmoji, getMonitorStatusColor, getMonitorStatusIcon, getSummaryMessage } from "./utils/display";
import { showToast, Toast } from "@raycast/api";
import { useAppStore } from "./utils/store";

export default function Command() {
  const [kuma_url, setKumaUrl] = useState<string>("");
  const [monitorListFetched, setMonitorListFetched] = useState<boolean>(false);
  const [kumaInstance, setKumaInstance] = useState<UptimeKuma | null>(null);
  const {
    monitors,
    setMonitors,
    updateMonitorHeartbeat,
    updateMonitorUptime,
    updateMonitorAvgPing,
    updateMonitorHeartbeatList,
  } = useAppStore();

  useEffect(() => {
    const { kuma_url, kuma_token } = getPreferenceValues();

    setKumaUrl(kuma_url);

    const kuma = new UptimeKuma(kuma_url, kuma_token);

    setKumaInstance(kuma);

    kuma.on("connected", () => {
      showToast({
        title: "Socket Connected",
        style: Toast.Style.Success,
      });
      kuma.authenticate();
    });

    kuma.on("error", (error) => {
      showToast({
        title: "Error",
        message: error,
        style: Toast.Style.Failure,
      });

      setMonitorListFetched(true);
    });

    kuma.on("monitorList", (newMonitors) => {
      // Convert the received object to an array
      const updatedMonitors = Object.values(newMonitors) as Array<Monitor>;

      setMonitors(updatedMonitors);

      setMonitorListFetched(true);
    });

    kuma.on("heartbeatList", (payload: HeartbeatList) => {
      updateMonitorHeartbeatList(payload);
    });

    kuma.on("heartbeat", (hearbeat: Heartbeat) => {
      updateMonitorHeartbeat(hearbeat);
    });

    kuma.on("avgPing", (avgPing: AvgPing) => {
      updateMonitorAvgPing(avgPing);
    });

    kuma.on("uptime", (payload: Uptime) => {
      updateMonitorUptime(payload);
    });

    kuma.connect();
  }, []);

  return (
    <List navigationTitle="Monitors" isLoading={!monitorListFetched}>
      {monitors.map((monitor) => (
        <List.Item
          key={monitor.id}
          title={monitor.name}
          subtitle={`${getSummaryMessage(monitor)}`}
          accessoryTitle={monitor.heartbeats ? getHeartbeatListEmoji(monitor.heartbeats, 5) : ""}
          actions={
            <ActionPanel>
              <Action.Push title="Monitor Detail" target={<MonitorDetail monitorId={monitor.id} />} />

              <Action
                title={`${monitor.active ? "Pause Monitor" : "Resume Monitor"}`}
                onAction={() => {
                  if (monitor.active) {
                    kumaInstance?.pauseMonitor(monitor.id, () => {
                      showToast({
                        title: "Monitor paused",
                        style: Toast.Style.Success,
                      });
                    });
                  } else {
                    kumaInstance?.resumeMonitor(monitor.id, () => {
                      showToast({
                        title: "Monitor resumed",
                        style: Toast.Style.Success,
                      });
                    });
                  }
                }}
                icon={
                  monitor.active
                    ? { source: Icon.Pause, tintColor: Color.Yellow }
                    : { source: Icon.Play, tintColor: Color.Green }
                }
              />

              <Action.OpenInBrowser title={"Open in Kuma Dashboard"} url={`${kuma_url}/dashboard/${monitor.id}`} />
              {monitor.type == "http" && (
                <Action.OpenInBrowser title={"Open Target in Browser"} url={`${monitor.url}`} />
              )}
            </ActionPanel>
          }
          icon={{ source: getMonitorStatusIcon(monitor), tintColor: getMonitorStatusColor(monitor) }}
        />
      ))}
    </List>
  );
}
