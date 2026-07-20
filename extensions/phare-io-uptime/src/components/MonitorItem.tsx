import { List, Icon } from "@raycast/api";
import { Monitor } from "../types";
import { MonitorDetail } from "./MonitorDetail";
import { MonitorActions } from "./MonitorActions";
import { getEffectiveStatus } from "../utils/monitorUtils";

interface MonitorItemProps {
  monitor: Monitor;
  apiKey: string;
}

export function MonitorItem({ monitor, apiKey }: MonitorItemProps) {
  const effectiveStatus = getEffectiveStatus(monitor);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return Icon.CheckCircle;
      case "offline":
        return Icon.XMarkCircle;
      case "partial":
        return Icon.ExclamationMark;
      case "paused":
        return Icon.Pause;
      case "fetching":
        return Icon.Clock;
      default:
        return Icon.Network;
    }
  };

  return (
    <List.Item
      key={monitor.id}
      icon={getStatusIcon(effectiveStatus)}
      title={monitor.name}
      detail={<MonitorDetail monitor={monitor} />}
      actions={<MonitorActions monitor={monitor} apiKey={apiKey} />}
    />
  );
}
