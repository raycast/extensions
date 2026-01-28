import { useMemo } from "react";
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
import { useAppStore } from "./utils/store";
import { getFavicon } from "@raycast/utils";

dayjs.extend(utc);
dayjs.extend(localizedFormat);

interface Props {
  monitorId: number;
}

export function MonitorDetail(props: Props) {
  const { monitorId } = props;

  const { monitors } = useAppStore();

  const monitor = useMemo(() => {
    return monitors.find((m) => m.id === monitorId);
  }, [monitors, monitorId]);

  const lastCheck = useMemo(() => {
    if (monitor?.heartbeat?.time) {
      const date = dayjs.utc(monitor.heartbeat.time);
      const formattedDate = date.local().format("L LTS");

      return formattedDate;
    }
    return "";
  }, [monitor?.heartbeat?.time]);

  const accessories = useMemo(() => {
    return monitor?.tags.map((t) => {
      return {
        icon: Icon.Tag,
        tag: t.name,
      };
    });
  }, [monitor]);

  return (
    <>
      {monitor && (
        <List>
          <List.Item
            title={"Name"}
            accessories={[
              {
                text: monitor.name,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={"Copy Name"} content={monitor.name} />
              </ActionPanel>
            }
          />
          {monitor.tags?.length > 0 && (
            <List.Item
              title={"Tags"}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title={"Copy Tags"} content={monitor.tags.map((t) => t.name).join(", ")} />
                </ActionPanel>
              }
            />
          )}
          <List.Item
            title={"Status"}
            accessories={[
              {
                text: getMonitorStatus(monitor),
                icon: {
                  source: getMonitorStatusIcon(monitor),
                  tintColor: getMonitorStatusColor(monitor),
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={"Copy Status"} content={getMonitorStatus(monitor)} />
              </ActionPanel>
            }
          />

          {monitor.heartbeats && monitor.heartbeats?.length > 0 && (
            <List.Item
              title={"Heartbeats"}
              accessories={[
                {
                  text: getHeartbeatListEmoji(monitor.heartbeats, 30) + " Now",
                  icon: Icon.Heart,
                },
              ]}
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
              accessories={[
                {
                  text: `${getPingTitle(monitor.type, true)}: ${monitor.avgPing}ms`,
                  icon: Icon.Heartbeat,
                },
              ]}
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
              accessories={[
                {
                  text: `${getPingTitle(monitor.type)}: ${monitor.heartbeat.ping}ms`,
                  icon: Icon.Heartbeat,
                },
              ]}
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
              accessories={[
                {
                  text: `${monitor.uptime24.toFixed(2)}%`,
                  icon: Icon.Plug,
                },
              ]}
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
              accessories={[
                {
                  text: `${monitor.uptime720.toFixed(2)}%`,
                  icon: Icon.Plug,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title={"Copy Uptime"} content={`${monitor.uptime720.toFixed(2)}%`} />
                </ActionPanel>
              }
            />
          )}

          <List.Item
            title={"Monitor Type"}
            accessories={[
              {
                tag: `${monitor.type}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={"Copy Type"} content={`${monitor.type}`} />
              </ActionPanel>
            }
          />
          {monitor.type == "http" && (
            <List.Item
              title={"URL"}
              icon={{ source: Icon.Globe, tintColor: Color.PrimaryText }}
              accessories={[
                {
                  text: `${monitor.url}`,
                  icon: getFavicon(monitor.url, { fallback: Icon.Globe }),
                },
              ]}
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
              accessories={[
                {
                  text: `${monitor.heartbeat.msg}`,
                },
              ]}
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
              accessories={[
                {
                  text: `${lastCheck}`,
                  icon: Icon.Clock,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title={"Copy Time"} content={lastCheck} />
                </ActionPanel>
              }
            />
          )}
        </List>
      )}
    </>
  );
}

export default MonitorDetail;
