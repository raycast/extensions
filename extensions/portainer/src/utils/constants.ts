import { Color, Icon } from "@raycast/api";
import { ContainerState, StackStatus } from "../api/types";

// Container state colors
export const CONTAINER_STATE_COLORS: Record<ContainerState, Color> = {
  running: Color.Green,
  exited: Color.Red,
  paused: Color.Yellow,
  restarting: Color.Orange,
  dead: Color.Red,
  created: Color.Blue,
  removing: Color.Orange,
};

// Container state icons
export const CONTAINER_STATE_ICONS: Record<ContainerState, Icon> = {
  running: Icon.CircleFilled,
  exited: Icon.CircleDisabled,
  paused: Icon.Pause,
  restarting: Icon.ArrowClockwise,
  dead: Icon.XMarkCircle,
  created: Icon.Circle,
  removing: Icon.Trash,
};

// Stack status colors
export const STACK_STATUS_COLORS: Record<number, Color> = {
  [StackStatus.Active]: Color.Green,
  [StackStatus.Inactive]: Color.Red,
};

// Stack status icons
export const STACK_STATUS_ICONS: Record<number, Icon> = {
  [StackStatus.Active]: Icon.CircleFilled,
  [StackStatus.Inactive]: Icon.CircleDisabled,
};

// Stack status labels
export const STACK_STATUS_LABELS: Record<number, string> = {
  [StackStatus.Active]: "Active",
  [StackStatus.Inactive]: "Inactive",
};

// Network driver icons
export const NETWORK_DRIVER_ICONS: Record<string, Icon> = {
  bridge: Icon.Globe,
  host: Icon.House,
  overlay: Icon.Layers,
  macvlan: Icon.Network,
  none: Icon.XMarkCircle,
  null: Icon.XMarkCircle,
};

// Volume driver icons
export const VOLUME_DRIVER_ICONS: Record<string, Icon> = {
  local: Icon.HardDrive,
  nfs: Icon.Network,
};

// Default icons
export const DEFAULT_ICONS = {
  container: Icon.Box,
  stack: Icon.Layers,
  image: Icon.Document,
  volume: Icon.HardDrive,
  network: Icon.Network,
};
