import { Image } from "@raycast/api";
import { usePulseIcons } from "@/ui/use-pulse-icons";
import { MONITOR_STATUS_COLOR } from "@/ui/monitors/monitor-status";
import { MonitorStatus } from "@/domain/monitor";

const ALL_STATUSES: MonitorStatus[] = [
  MonitorStatus.UP,
  MonitorStatus.DOWN,
  MonitorStatus.PAUSED,
  MonitorStatus.PENDING,
  MonitorStatus.VALIDATING,
  MonitorStatus.MAINTENANCE,
];

export function useMonitorStatusIcons(): Record<MonitorStatus, Image.ImageLike> {
  return usePulseIcons(ALL_STATUSES, MONITOR_STATUS_COLOR);
}
