/** A Kitty window (a single pane/split within a tab) as returned by `kitten @ ls` */
export interface KittyWindow {
  id: number;
  title: string;
  cwd: string;
  pid: number;
  cmdline: string[];
  is_focused: boolean;
  is_self: boolean;
  foreground_processes: { pid: number; cmdline: string[] }[];
}

/** A Kitty tab containing one or more windows */
export interface KittyTab {
  id: number;
  title: string;
  is_focused: boolean;
  layout: string;
  windows: KittyWindow[];
}

/** A Kitty OS-level window containing tabs */
export interface KittyOSWindow {
  id: number;
  is_focused: boolean;
  tabs: KittyTab[];
}

/** Launch configuration stored in LocalStorage */
export interface LaunchConfig {
  name: string;
  windows: { tabs: TabConfig[] }[];
}

export interface TabConfig {
  title?: string;
  layout: PaneConfig;
}

export interface PaneConfig {
  cwd?: string;
  split_direction?: "vertical" | "horizontal";
  panes?: PaneConfig[];
  commands?: Array<{ exec: string }>;
}
