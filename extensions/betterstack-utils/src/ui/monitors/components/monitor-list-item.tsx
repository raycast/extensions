import { Image, List } from "@raycast/api";
import { Monitor } from "@/domain/monitor";
import { MONITOR_STATUS_COLOR, MONITOR_STATUS_LABEL } from "@/ui/monitors/monitor-status";
import { MonitorListActionPanel } from "@/ui/monitors/action-panel/monitor-list-action-panel";

interface MonitorListItemProps {
  monitor: Monitor & { webUrl: string };
  icon: Image.ImageLike;
  onRefresh: () => void;
}

export function MonitorListItem({ monitor, icon, onRefresh }: MonitorListItemProps) {
  return (
    <List.Item
      id={monitor.id}
      title={monitor.name}
      subtitle={monitor.url}
      icon={icon}
      accessories={[
        { tag: { value: MONITOR_STATUS_LABEL[monitor.status], color: MONITOR_STATUS_COLOR[monitor.status] } },
      ]}
      actions={<MonitorListActionPanel monitor={monitor} onRefresh={onRefresh} />}
    />
  );
}
