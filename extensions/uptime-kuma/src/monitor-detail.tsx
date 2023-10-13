import { AvgPing, Heartbeat, Monitor, Uptime, UptimeKuma } from "./modules/UptimeKuma";
import { useMemo, useEffect } from "react";
import { Action, ActionPanel, Icon, Color, List } from "@raycast/api";
import {
  getHeartbeatListEmoji,
  getMonitorStatus,
  getMonitorStatusColor,
  getMonitorStatusIcon,
  getPingTitle,
} from "./utils/display";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { useImmer } from "use-immer";

dayjs.extend(utc);
dayjs.extend(localizedFormat);

interface Props {
  monitor: Monitor;
  kuma: UptimeKuma | null;
}

export function MonitorDetail(props: Props) {
  // make a copy of paramMonitor

  const [monitor, setMonitor] = useImmer<Monitor>({ ...props.monitor });
  const { kuma } = props;

  const lastCheck = useMemo(() => {
    if (monitor.heartbeat?.time) {
      const date = dayjs.utc(monitor.heartbeat.time);
      const formattedDate = date.local().format("L LTS");

      return formattedDate;
    }
    return "";
  }, [monitor.heartbeat?.time]);

  useEffect(() => {
    if (kuma) {
      kuma.on("heartbeat", (hearbeat: Heartbeat) => {
        setMonitor((draft) => {
          if (draft.id === hearbeat.monitorID) {
            draft.heartbeat = hearbeat;
          }
        });
      });

      kuma.on("avgPing", (avgPing: AvgPing) => {
        setMonitor((draft) => {
          if (draft.id === avgPing.monitorID) {
            draft.avgPing = avgPing.avgPing;
          }
        });
      });

      kuma.on("uptime", (payload: Uptime) => {
        setMonitor((draft) => {
          if (draft.id === payload.monitorID) {
            if (payload.period == 720) {
              draft.uptime720 = payload.percent * 100;
            } else if (payload.period == 24) {
              draft.uptime24 = payload.percent * 100;
            }
          }
        });
      });
    }
  }, [kuma]);

  return (
    <List>
      <List.Item
        title={"Name"}
        subtitle={monitor.name}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title={"Copy Name"} content={monitor.name} />
          </ActionPanel>
        }
      />
      <List.Item
        title={"Tags"}
        subtitle={monitor.tags.map((t) => t.name).join(", ")}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title={"Copy Tags"} content={monitor.tags.map((t) => t.name).join(", ")} />
          </ActionPanel>
        }
      />
      <List.Item
        title={"Status"}
        subtitle={getMonitorStatus(monitor)}
        icon={{ source: getMonitorStatusIcon(monitor), tintColor: getMonitorStatusColor(monitor) }}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title={"Copy Status"} content={getMonitorStatus(monitor)} />
          </ActionPanel>
        }
      />

      {monitor.heartbeats && monitor.heartbeats?.length > 0 && (
        <List.Item
          title={"Heartbeats"}
          subtitle={getHeartbeatListEmoji(monitor.heartbeats, 30) + " Now"}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title={"Copy Heartbeats"}
                content={getHeartbeatListEmoji(monitor.heartbeats, 30) + " Now"}
              />
            </ActionPanel>
          }
        ></List.Item>
      )}

      {monitor.avgPing && (
        <List.Item
          title={getPingTitle(monitor.type, true)}
          subtitle={`${monitor.avgPing}ms`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title={"Copy Ping"} content={`${monitor.avgPing}ms`} />
            </ActionPanel>
          }
        />
      )}
      {monitor.heartbeat?.ping && (
        <List.Item
          title={getPingTitle(monitor.type, false)}
          subtitle={`${monitor.heartbeat.ping}ms`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title={"Copy Ping"} content={`${monitor.heartbeat.ping}ms`} />
            </ActionPanel>
          }
        />
      )}

      {monitor.uptime24 !== undefined && !isNaN(monitor.uptime24) && (
        <List.Item
          title={"Uptime 24h"}
          subtitle={`${monitor.uptime24.toFixed(2)}%`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title={"Copy Uptime"} content={`${monitor.uptime24.toFixed(2)}%`} />
            </ActionPanel>
          }
        />
      )}
      {monitor.uptime720 !== undefined && !isNaN(monitor.uptime720) && (
        <List.Item
          title={"Uptime 30d"}
          subtitle={`${monitor.uptime720.toFixed(2)}%`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title={"Copy Uptime"} content={`${monitor.uptime720.toFixed(2)}%`} />
            </ActionPanel>
          }
        />
      )}

      <List.Item
        title={"Monitor Type"}
        subtitle={monitor.type}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title={"Copy Type"} content={`${monitor.type}`} />
          </ActionPanel>
        }
      />
      {monitor.type == "http" && (
        <List.Item
          title={"URL"}
          subtitle={monitor.url}
          icon={{ source: Icon.Globe, tintColor: Color.PrimaryText }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title={"Open Target in Browser"} url={`${monitor.url}`} />
              <Action.CopyToClipboard title={"Copy URL"} content={`${monitor.url}`} />
            </ActionPanel>
          }
        />
      )}

      {monitor.heartbeat?.msg && (
        <List.Item
          title={"Message"}
          subtitle={monitor.heartbeat.msg}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title={"Copy URL"} content={`${monitor.heartbeat.msg}`} />
            </ActionPanel>
          }
        />
      )}

      {monitor.heartbeat?.time && (
        <List.Item
          title={"Last check"}
          subtitle={lastCheck}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title={"Copy Time"} content={lastCheck} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

export default MonitorDetail;
