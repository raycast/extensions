/**
 * Raw pane entry returned by `wezterm cli list --format json`.
 * Each entry represents a single pane within a tab.
 */
export interface WezTermPaneEntry {
  window_id: number;
  tab_id: number;
  tab_title: string;
  pane_id: number;
  workspace: string;
  title: string;
  cwd: string; // file:// URL
  is_active: boolean;
  is_zoomed: boolean;
  tty_name: string;
  cursor_x: number;
  cursor_y: number;
  size: {
    rows: number;
    cols: number;
  };
}

/**
 * Processed tab with its panes grouped together.
 */
export interface WezTermTab {
  tabId: number;
  tabTitle: string;
  windowId: number;
  workspace: string;
  isActive: boolean;
  panes: WezTermPane[];
}

/**
 * Processed pane with parsed CWD.
 */
export interface WezTermPane {
  paneId: number;
  title: string;
  cwd: string; // parsed filesystem path
  isActive: boolean;
  isZoomed: boolean;
  ttyName: string;
  size: {
    rows: number;
    cols: number;
  };
}

/**
 * Workspace with its tabs grouped together.
 */
export interface WezTermWorkspace {
  name: string;
  tabs: WezTermTab[];
  tabCount: number;
  paneCount: number;
  hasActiveTab: boolean;
}
