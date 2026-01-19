export type Endpoint =
  | "/ping"
  | TileEndpoint
  | SetEndpoint
  | TransportEndpoint
  | MasterEndpoint
  | InspectorEndpoint
  | ListEndpoint
  | GlobalEndpoint;

export type TileEndpoint = `${TileBaseAddress}/${TileAction}`;

export type TileBaseAddress = `/set/${number | "selected"}/tile/${`${number}/${number}` | "selected"}`;

export type TileAction =
  | "allowPausing"
  | "back"
  | "color"
  | "currentPosition"
  | "currentTime"
  | "duration"
  | "fadeOut"
  | "holdToPlay"
  | "loop"
  | "mute"
  | "notes"
  | "peakMeterL"
  | "peakMeterR"
  | "play"
  | "remainingTime"
  | "rmsMeterL"
  | "rmsMeterR"
  | "select"
  | "solo"
  | "title"
  | "toggleAB"
  | "volume";

export type SetEndpoint = `/set/${number | "selected"}`;

export type TransportEndpoint = `/transport/${TransportAction}`;

export type TransportAction = "playPauseAll" | "stopAll" | "previous" | "next";

export type MasterEndpoint = `/master/${MasterAction}`;

export type MasterAction = "volumeUp" | "volumeDown" | "mute" | "volume" | "fadeAll" | "toggleAB";

export type InspectorEndpoint = `/inspector/${InspectorAction}`;

export type InspectorAction =
  | "volume"
  | "volumeUp"
  | "volumeDown"
  | "toggleAB"
  | "mute"
  | "loop"
  | "solo"
  | "holdToPlay"
  | "pausable"
  | "color";

export type ListEndpoint = `/list/${ListAction}`;

export type ListAction = "reset" | "crossfadeDuration";

export type GlobalEndpoint = `/global/${GlobalAction}`;

export type GlobalAction = "bringForward";
