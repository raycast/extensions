import { Color } from "@raycast/api";
import { StatusPageState } from "@/domain/status-page";
import { ResourceStatus } from "@/domain/status-page-resource";

export const STATE_COLOR: Record<StatusPageState, Color.Dynamic> = {
  [StatusPageState.OPERATIONAL]: { light: "#218358", dark: "#16C77A", adjustContrast: true },
  [StatusPageState.DEGRADED]: { light: "#CC4E00", dark: "#E7B84A", adjustContrast: true },
  [StatusPageState.DOWNTIME]: { light: "#CE2C31", dark: "#FF8738", adjustContrast: true },
  [StatusPageState.MAINTENANCE]: { light: "#0D74CE", dark: "#21A7FF", adjustContrast: true },
};

export const RESOURCE_STATUS_COLOR: Record<ResourceStatus, Color.Dynamic> = {
  [ResourceStatus.OPERATIONAL]: STATE_COLOR[StatusPageState.OPERATIONAL],
  [ResourceStatus.DEGRADED]: STATE_COLOR[StatusPageState.DEGRADED],
  [ResourceStatus.DOWNTIME]: STATE_COLOR[StatusPageState.DOWNTIME],
  [ResourceStatus.MAINTENANCE]: STATE_COLOR[StatusPageState.MAINTENANCE],
  [ResourceStatus.NOT_MONITORED]: { light: "#94A3B8", dark: "#4B5563" },
};
