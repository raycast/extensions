import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { AvgPing, Heartbeat, HeartbeatList, Monitor, MonitorStatus, Uptime, UptimeKuma } from "./modules/UptimeKuma";
import { useCachedState } from "@raycast/utils";
import useAppStore from "./utils/store";
import { getAccessories, getMonitorStatusColor, getMonitorStatusIcon } from "./utils/display";
import MonitorDetail from "./monitor-detail";

export function ListMonitors() {
  const [kuma_url, setKumaUrl] = useCachedState<string>("kuma-url", "");
  const [kuma_error, setKumaError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [kumaInstance, setKumaInstance] = useState<UptimeKuma | null>(null);
  const {
    monitors,
    setMonitors,
    updateMonitorHeartbeat,
    updateMonitorUptime,
    updateMonitorAvgPing,
    updateMonitorHeartbeatList,
  } = useAppStore();

  async function logout() {
    await confirmAlert({
      title: "Logout",
      icon: { source: Icon.Power, tintColor: Color.Red },
      message: "Are you sure you want to logout?",
      primaryAction: {
        title: "Log out",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          setMonitors([]);
          setKumaUrl("");
          await LocalStorage.removeItem("kuma_token");
          await showToast({ title: "Success", message: "Successfully logged out" });
        },
      },
    });
  }

  async function initCommand() {
    const kuma_token = await LocalStorage.getItem("kuma_token");
    const kuma = new UptimeKuma(kuma_url, kuma_token as string);

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

      setIsLoading(false);
      kuma.disconnect();

      setKumaError(
        "If you think your connection settings are wrong, press Enter to run the Login Action and enter your new settings.",
      );
    });

    kuma.on("monitorList", (newMonitors) => {
      // Convert the received object to an array
      const updatedMonitors = Object.values(newMonitors) as Array<Monitor>;

      setMonitors(updatedMonitors);

      setIsLoading(false);
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
  }

  useEffect(() => {
    initCommand();
  }, []);

  const [filter, setFilter] = useState("");
  const filteredMonitors = useMemo(
    () =>
      !filter
        ? monitors
        : monitors.filter((monitor) => {
            const [type, val] = filter.split("=", 2);
            if (type === "status")
              return monitor.heartbeat?.status === MonitorStatus[val as keyof typeof MonitorStatus];
          }),
    [monitors, filter],
  );

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        !monitors.length ? undefined : (
          <List.Dropdown tooltip="Filter" onChange={setFilter}>
            <List.Dropdown.Item title="All" value="" />
            <List.Dropdown.Section title="Status">
              {Object.keys(MonitorStatus)
                .filter((key) => isNaN(Number(key))) // Filter out numeric keys
                .map((key) => (
                  <List.Dropdown.Item key={key} title={key} value={`status=${key}`} />
                ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        )
      }
    >
      {kuma_error.length > 0 ? (
        <List.EmptyView
          title="Error"
          description={kuma_error}
          icon="noview.png"
          actions={
            <ActionPanel>
              <Action onAction={logout} title="Login" icon="noview.png" />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView title="No Results" icon="noview.png" />
      )}
      {filteredMonitors.map((monitor) => (
        <List.Item
          id={monitor.id.toString()}
          key={monitor.id}
          title={monitor.name}
          accessories={getAccessories(monitor)}
          actions={
            <ActionPanel>
              <Action.Push title="Monitor Detail" icon={Icon.Info} target={<MonitorDetail monitorId={monitor.id} />} />
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

              <Action.OpenInBrowser
                title={"Open Monitor In Kuma Dashboard"}
                url={`${kuma_url}/dashboard/${monitor.id}`}
              />
              {monitor.type == "http" && (
                <Action.OpenInBrowser title={"Open Target In Browser"} url={`${monitor.url}`} />
              )}

              <Action
                title={"Logout"}
                icon={{
                  source: Icon.Power,
                  tintColor: Color.Red,
                }}
                onAction={logout}
              />
            </ActionPanel>
          }
          icon={{ source: getMonitorStatusIcon(monitor), tintColor: getMonitorStatusColor(monitor) }}
        />
      ))}
    </List>
  );
}
