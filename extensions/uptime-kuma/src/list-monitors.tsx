import {Action, ActionPanel, getPreferenceValues, Icon, Color, List} from "@raycast/api";
import {UptimeKuma, Monitor, Uptime, AvgPing, Heartbeat, HeartbeatList, Tag} from "./modules/UptimeKuma";
import {useEffect, useState} from "react";
import {useImmer} from "use-immer";
import {MonitorDetail} from "./monitor-detail";
import {
  getHeartbeatListEmoji,
  getMonitorStatusColor,
  getMonitorStatusIcon,
  getSummaryMessage,
} from "./utils/display";
import {showToast, Toast} from "@raycast/api";

export default function Command() {

  const [monitors, setMonitors] = useImmer<Array<Monitor>>([]);
  const [kuma_url, setKumaUrl] = useState<string>("");
  const [monitorListFetched, setMonitorListFetched] = useState<boolean>(false);
  const [kumaInstance, setKumaInstance] = useState<UptimeKuma | null>(null);

  useEffect(() => {
    const {kuma_url, kuma_token} = getPreferenceValues();

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

    kuma.on("authenticated", () => {

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
      const updatedMonitors = Object.values(newMonitors);

      setMonitors((draft) => {
        updatedMonitors.forEach((updatedMonitor: any) => {
          const index = draft.findIndex((m: any) => m.id === updatedMonitor.id);

          if (index !== -1) {
            // Si le monitor existe déjà, mettez-le à jour
            Object.assign(draft[index], updatedMonitor);
          } else {
            // Sinon, ajoutez le nouveau monitor
            draft.push(updatedMonitor);
          }
        });

        // Supprimez les moniteurs qui n'existent plus dans le nouvel ensemble
        for (let i = draft.length - 1; i >= 0; i--) {
          if (!updatedMonitors.some((m: any) => m.id === draft[i].id)) {
            draft.splice(i, 1);
          }
        }
      });

      setMonitorListFetched(true);
    });

    kuma.on("heartbeatList", (payload: HeartbeatList) => {
      setMonitors((draft) => {
        const monitor = draft.find((monitor) => monitor.id == payload.monitorID);
        if (monitor) {
          monitor.heartbeats = payload.heartbeatList;

          if (payload.heartbeatList.length > 0) {
            monitor.heartbeat = payload.heartbeatList.at(-1);
          }
        }
      });
    });

    kuma.on("heartbeat", (hearbeat: Heartbeat) => {
      setMonitors((draft) => {
        const monitor = draft.find((monitor) => monitor.id == hearbeat.monitorID);
        if (monitor) {
          monitor.heartbeat = hearbeat;
        }
      });
    });

    kuma.on("avgPing", (avgPing: AvgPing) => {
      setMonitors((draft) => {
        const monitor = draft.find((monitor) => monitor.id == avgPing.monitorID);
        if (monitor) {
          monitor.avgPing = avgPing.avgPing;
        }
      });
    });

    kuma.on("uptime", (payload: Uptime) => {
      setMonitors((draft) => {
        const monitor = draft.find((monitor) => monitor.id == payload.monitorID);
        if (monitor) {
          if (payload.period == 720) {

            monitor.uptime720 = payload.percent * 100;
          } else if (payload.period == 24) {
            monitor.uptime24 = payload.percent * 100;
          }
        }
      });
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
              <Action.Push title="Monitor detail"
                           target={<MonitorDetail kuma={kumaInstance} monitor={monitor}/>}/>

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
                    ? {source: Icon.Pause, tintColor: Color.Yellow}
                    : {source: Icon.Play, tintColor: Color.Green}
                }
              />

              <Action.OpenInBrowser title={"Open in Kuma dashboard"}
                                    url={`${kuma_url}/dashboard/${monitor.id}`}/>
              {monitor.type == "http" && (
                <Action.OpenInBrowser title={"Open target in browser"} url={`${monitor.url}`}/>
              )}
            </ActionPanel>
          }
          icon={{source: getMonitorStatusIcon(monitor), tintColor: getMonitorStatusColor(monitor)}}
        />
      ))}</List>

  );
}
