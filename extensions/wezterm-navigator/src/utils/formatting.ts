import { homedir } from "os";
import { Color, Icon } from "@raycast/api";
import type { WezTermPane, WezTermTab } from "../types";

const HOME = homedir();

/**
 * Shorten a filesystem path by replacing the home directory with ~.
 */
export function shortenPath(cwd: string): string {
  if (!cwd) return "";
  if (cwd.startsWith(HOME)) {
    return "~" + cwd.slice(HOME.length);
  }
  return cwd;
}

/**
 * Get just the last directory name from a path.
 */
export function dirName(cwd: string): string {
  if (!cwd) return "";
  const parts = cwd.replace(/\/$/, "").split("/");
  return parts[parts.length - 1] || cwd;
}

/**
 * Format terminal size as "cols×rows".
 */
export function formatSize(size: { rows: number; cols: number }): string {
  return `${size.cols}×${size.rows}`;
}

/**
 * Get a display title for a tab, preferring tab_title over process title.
 */
export function getTabDisplayTitle(tab: WezTermTab): string {
  if (tab.tabTitle && tab.tabTitle !== tab.panes[0]?.title) {
    return tab.tabTitle;
  }
  // Fall back to the active pane's title or the first pane
  const activePane = tab.panes.find((p) => p.isActive) ?? tab.panes[0];
  return activePane?.title || `Tab ${tab.tabId}`;
}

/**
 * Get a subtitle showing CWD for the active pane.
 */
export function getTabSubtitle(tab: WezTermTab): string {
  const activePane = tab.panes.find((p) => p.isActive) ?? tab.panes[0];
  return shortenPath(activePane?.cwd ?? "");
}

/**
 * Get accessories for a tab list item.
 */
export function getTabAccessories(tab: WezTermTab): Array<{
  text?: string;
  icon?: { source: string; tintColor?: string };
  tag?: { value: string; color?: string };
  tooltip?: string;
}> {
  const accessories: Array<{
    text?: string;
    icon?: { source: string; tintColor?: string };
    tag?: { value: string; color?: string };
    tooltip?: string;
  }> = [];

  // Pane count (if more than 1)
  if (tab.panes.length > 1) {
    accessories.push({
      text: `${tab.panes.length} panes`,
      tooltip: `${tab.panes.length} panes in this tab`,
    });
  }

  // Active indicator
  if (tab.isActive) {
    accessories.push({
      tag: { value: "Active", color: Color.Green },
    });
  }

  // CWD as tag
  const activePane = tab.panes.find((p) => p.isActive) ?? tab.panes[0];
  if (activePane?.cwd) {
    accessories.push({
      text: dirName(activePane.cwd),
      tooltip: shortenPath(activePane.cwd),
    });
  }

  return accessories;
}

/**
 * Get the icon for a tab, tinted green if active.
 */
export function getTabIcon(tab: WezTermTab): { source: string; tintColor?: string } {
  return {
    source: Icon.Terminal,
    tintColor: tab.isActive ? Color.Green : undefined,
  };
}

/**
 * Get keywords for a tab (for search).
 */
export function getTabKeywords(tab: WezTermTab): string[] {
  const keywords: string[] = [tab.workspace, tab.tabTitle];
  for (const pane of tab.panes) {
    keywords.push(pane.title, dirName(pane.cwd));
  }
  return keywords.filter(Boolean);
}

/**
 * Get the active pane from a tab.
 */
export function getActivePane(tab: WezTermTab): WezTermPane | undefined {
  return tab.panes.find((p) => p.isActive) ?? tab.panes[0];
}
