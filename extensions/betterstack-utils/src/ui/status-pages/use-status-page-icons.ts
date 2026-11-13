import { Image } from "@raycast/api";
import { usePulseIcons } from "@/ui/use-pulse-icons";
import { STATE_COLOR } from "@/ui/status-pages/status-colors";
import { StatusPageState } from "@/domain/status-page";

const ALL_STATES: StatusPageState[] = [
  StatusPageState.OPERATIONAL,
  StatusPageState.DEGRADED,
  StatusPageState.DOWNTIME,
  StatusPageState.MAINTENANCE,
];

export function useStatusPageIcons(): Record<StatusPageState, Image.ImageLike> {
  return usePulseIcons(ALL_STATES, STATE_COLOR);
}
