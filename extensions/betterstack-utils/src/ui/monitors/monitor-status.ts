import { Color } from "@raycast/api";
import { MonitorStatus } from "@/domain/monitor";

export const MONITOR_STATUS_COLOR: Record<MonitorStatus, Color.Dynamic> = {
  [MonitorStatus.UP]: { light: "#218358", dark: "#16C77A", adjustContrast: true },
  [MonitorStatus.DOWN]: { light: "#CE2C31", dark: "#FF8738", adjustContrast: true },
  [MonitorStatus.PAUSED]: { light: "#94A3B8", dark: "#4B5563" },
  [MonitorStatus.PENDING]: { light: "#CC4E00", dark: "#E7B84A", adjustContrast: true },
  [MonitorStatus.VALIDATING]: { light: "#CC4E00", dark: "#E7B84A", adjustContrast: true },
  [MonitorStatus.MAINTENANCE]: { light: "#0D74CE", dark: "#21A7FF", adjustContrast: true },
};

export const MONITOR_STATUS_LABEL: Record<MonitorStatus, string> = {
  [MonitorStatus.UP]: "Up",
  [MonitorStatus.DOWN]: "Down",
  [MonitorStatus.PAUSED]: "Paused",
  [MonitorStatus.PENDING]: "Pending",
  [MonitorStatus.VALIDATING]: "Validating",
  [MonitorStatus.MAINTENANCE]: "Maintenance",
};
