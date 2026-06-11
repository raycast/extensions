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

/** Ghostty AppleScript API layout format (from ghostty-layouts) */
export type SplitDirection = "right" | "left" | "down" | "up";

export interface LayoutPane {
  split?: SplitDirection;
  splitFrom?: number;
  command?: string;
  focus?: boolean;
}

export interface LayoutTab {
  panes: LayoutPane[];
  /** Working directory for this tab's surface config. When set, overrides the window-level directory. */
  workingDirectory?: string;
  title?: string;
}

export interface WorkspaceLayout {
  id: string;
  title: string;
  description?: string;
  windowTitle?: string;
  openInNewWindow?: boolean;
  tabs: LayoutTab[];
}

export interface WorkspaceLaunchTarget {
  title: string;
  directory: string;
  layout: WorkspaceLayout;
}

export interface ChildDirectory {
  name: string;
  directory: string;
  lastModified: number;
}
