import { Heartbeat, Monitor } from "../modules/UptimeKuma";
import { Color, Icon } from "@raycast/api";

export const getMonitorStatus = (monitor: Monitor): string => {
  if (monitor.active === false) {
    return "Paused";
  }

  switch (monitor.heartbeat?.status) {
    case 0:
      return "Down";
    case 1:
      return "Up";
    case 2:
      return "Pending";
    case 3:
      return "Maintenance";
  }

  return "Unknown";
};

export const getMonitorStatusColor = (monitor: Monitor): string => {
  if (monitor.active === false) {
    return Color.Yellow;
  }

  switch (monitor.heartbeat?.status) {
    case 0:
      return Color.Red;
    case 1:
      return Color.Green;
    case 2:
      return Color.Orange;
    case 3:
      return Color.Blue;
  }

  return Color.SecondaryText;
};

export const getMonitorStatusIcon = (monitor: Monitor) => {
  if (monitor.active === false) {
    return Icon.Pause;
  }

  switch (monitor.heartbeat?.status) {
    case 0:
      return Icon.XMarkCircle;
    case 1:
      return Icon.CheckCircle;
    case 2:
      return Icon.Warning;
    case 3:
      return Icon.Gear;
  }

  return Icon.QuestionMarkCircle;
};

export const getAvgPingMessage = (monitor: Monitor) => {
  if (monitor.avgPing) {
    return `${getPingTitleShort(monitor.type, true)}: ${monitor.avgPing}ms`;
  }
  return "";
};

export const getUptimeDayMessage = (monitor: Monitor) => {
  // check if monitor,uptime24 key is defined (can be 0)

  if (monitor.uptime24 !== undefined && !isNaN(monitor.uptime24)) {
    return `24h: ${monitor.uptime24.toFixed(2)}%`;
  }

  return "";
};

export const getUptimeMonthMessage = (monitor: Monitor) => {
  // check if monitor,uptime24 key is defined (can be 0)

  if (monitor.uptime720 !== undefined && !isNaN(monitor.uptime720)) {
    return `30d: ${monitor.uptime720.toFixed(2)}%`;
  }

  return "";
};

export const getHeartbeatPingMessage = (monitor: Monitor) => {
  if (monitor.heartbeat?.ping) {
    return `${getPingTitleShort(monitor.type, false)}: ${monitor.heartbeat.ping}ms`;
  }
  return "";
};

export const getSummaryMessage = (monitor: Monitor) => {
  const message = [
    getUptimeDayMessage(monitor),
    getUptimeMonthMessage(monitor),
    getAvgPingMessage(monitor),
    getHeartbeatPingMessage(monitor),
  ];

  return message.filter(Boolean).join(" - ");
};

export function getPingTitleShort(type: string, average = false) {
  if (type === "http" || type === "keyword" || type === "json-query") {
    return average ? "Avg Rsp" : "Last Rsp";
  } else {
    return average ? "Avg Ping" : "Last Ping";
  }
}

export function getPingTitle(type: string, average = false) {
  if (type === "http" || type === "keyword" || type === "json-query") {
    return average ? "Average Response" : "Last Response";
  } else {
    return average ? "Average Ping" : "Last Ping";
  }
}

export function getHeartbeatEmoji(heartbeat: Heartbeat) {
  switch (heartbeat.status) {
    case 0:
      return "🟥";
    case 1:
      return "🟩";
    case 2:
      return "🟧";
    case 3:
      return "🟦";
  }

  return "❓";
}

export function getHeartbeatListEmoji(heartbeats: Array<Heartbeat>, count = 20) {
  const heartbeatsLine = heartbeats
    .slice(-count)
    .map((heartbeat) => getHeartbeatEmoji(heartbeat))
    .join("");

  return heartbeatsLine;
}
