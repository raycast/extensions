import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  LocalStorage,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { AvgPing, Heartbeat, HeartbeatList, Monitor, Uptime, UptimeKuma } from "./modules/UptimeKuma";
import { useEffect, useState } from "react";
import { MonitorDetail } from "./monitor-detail";
import { getMonitorStatusColor, getMonitorStatusIcon, getAccessories } from "./utils/display";
import { useAppStore } from "./utils/store";
import { AuthForm } from "./auth-form";
import { ErrorScreen } from "./error-screen";

export default function Command() {
  const [kuma_url, setKumaUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [kumaInstance, setKumaInstance] = useState<UptimeKuma | null>(null);
  const {
    monitors,
    setMonitors,
    updateMonitorHeartbeat,
    updateMonitorUptime,
    updateMonitorAvgPing,
    updateMonitorHeartbeatList,
  } = useAppStore();

  const { push } = useNavigation();

  function logout() {
    LocalStorage.removeItem("kuma_url");
    LocalStorage.removeItem("kuma_token");
    setMonitors([]);
    push(<AuthForm />);
  }

  async function initCommand() {
    const kuma_url: string | undefined = await LocalStorage.getItem("kuma_url");
    const kuma_token: string | undefined = await LocalStorage.getItem("kuma_token");

    if (!kuma_url || !kuma_token) {
      push(<AuthForm />);

      return;
    }

    setIsLoading(true);

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

      setIsLoading(false);
      kuma.disconnect();

      const errorMessage = `
**Error**: ${error}

If you think your connection settings are wrong, press Enter to run the Login Action and enter your new settings.
`;

      push(<ErrorScreen title={"Socket error"} message={errorMessage} />);
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

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.Push title="Login" icon={Icon.Power} target={<AuthForm />} />
        </ActionPanel>
      }
    >
      {monitors.map((monitor) => (
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
