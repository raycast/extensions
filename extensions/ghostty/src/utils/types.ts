export interface LaunchConfig {
  name: string;
  windows: { tabs: { title?: string; color?: string; layout: PaneConfig }[] }[];
}

export interface PaneConfig {
  cwd?: string;
  split_direction?: "vertical" | "horizontal";
  panes?: PaneConfig[];
  commands?: Array<{ exec: string }>;
}
