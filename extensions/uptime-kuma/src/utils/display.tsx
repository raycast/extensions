import { Heartbeat, Monitor, MonitorStatus } from "../modules/UptimeKuma";
import { Color, Icon, List } from "@raycast/api";

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
    case MonitorStatus.DOWN:
      return Icon.XMarkCircle;
    case MonitorStatus.UP:
      return Icon.CheckCircle;
    case MonitorStatus.PENDING:
      return Icon.Warning;
    case MonitorStatus.MAINTENANCE:
      return Icon.Gear;
  }

  return Icon.QuestionMarkCircle;
};

export const getAvgPing = (monitor: Monitor) => {
  if (monitor.avgPing) {
    return monitor.avgPing + "ms";
  }
  return "-- ms";
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

function isNumber(value: any): value is number {
  return typeof value === "number";
}

export function getAccessories(monitor: Monitor): Array<List.Item.Accessory> {
  const accessories: Array<List.Item.Accessory> = [];

  const avgPingText = isNumber(monitor.avgPing) ? `${monitor.avgPing}ms (avg)` : "";
  const heartbeatPingText = isNumber(monitor.heartbeat?.ping) ? `${monitor.heartbeat?.ping}ms (last)` : "";

  if (avgPingText || heartbeatPingText) {
    const text = [avgPingText, heartbeatPingText].filter((t) => t).join(" / ");

    accessories.push({
      icon: {
        source: Icon.Heartbeat,
        tintColor: Color.PrimaryText,
      },
      text: text,
      tooltip: `${getPingTitle(monitor.type)}: ${text}`,
    });
  }

  const uptime24Text = isNumber(monitor.uptime24) ? `${monitor.uptime24.toFixed(2)}% (24h)` : "";
  const uptime720Text = isNumber(monitor.uptime720) ? `${monitor.uptime720.toFixed(2)}% (30d)` : "";

  if (uptime24Text || uptime720Text) {
    const text = [uptime24Text, uptime720Text].filter((t) => t).join(" / ");

    accessories.push({
      icon: {
        source: Icon.Plug,
        tintColor: Color.PrimaryText,
      },
      text: `${text}`,
      tooltip: `Uptime: ${text}`,
    });
  }

  if (monitor.heartbeats) {
    accessories.push({
      icon: {
        source: Icon.Heart,
        tintColor: Color.PrimaryText,
      },
      text: `${getHeartbeatListEmoji(monitor.heartbeats, 5)}`,
      tooltip: `Heartbeat: ${getHeartbeatListEmoji(monitor.heartbeats, 5)}`,
    });
  }

  return accessories;
}

export function getPingColor(ping: number) {
  if (ping < 300) {
    return Color.Green;
  } else if (ping < 600) {
    return Color.Yellow;
  } else {
    return Color.Red;
  }
}

export function getUptimeColor(uptime: number) {
  if (uptime > 99.8) {
    return Color.Green;
  } else if (uptime > 99.5) {
    return Color.Yellow;
  } else {
    return Color.Red;
  }
}
