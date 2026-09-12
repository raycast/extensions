import { execSync, exec } from "child_process";
import { writeFileSync } from "fs";

import type { WezTermPaneEntry, WezTermTab, WezTermPane, WezTermWorkspace } from "../types";

const WEZTERM_PATHS = [
  "/opt/homebrew/bin/wezterm",
  "/usr/local/bin/wezterm",
  "/Applications/WezTerm.app/Contents/MacOS/wezterm",
];

const ENV = {
  ...process.env,
  PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ""}`,
};

let cachedBinaryPath: string | null = null;

/**
 * Find the wezterm binary path, checking common installation locations.
 */
export function findWezTermBinary(): string | null {
  if (cachedBinaryPath) return cachedBinaryPath;

  for (const p of WEZTERM_PATHS) {
    try {
      execSync(`test -x "${p}"`, { env: ENV });
      cachedBinaryPath = p;
      return p;
    } catch {
      continue;
    }
  }

  // Fallback: try PATH lookup
  try {
    const resolved = execSync("which wezterm", { env: ENV, encoding: "utf-8" }).trim();
    if (resolved) {
      cachedBinaryPath = resolved;
      return resolved;
    }
  } catch {
    // not found
  }

  return null;
}

/**
 * Get the wezterm binary path or throw if not found.
 */
export function getWezTermBinary(): string {
  const binary = findWezTermBinary();
  if (!binary) {
    throw new Error("WezTerm binary not found");
  }
  return binary;
}

/**
 * Parse CWD from WezTerm's file:// URL format to a filesystem path.
 */
export function parseCwd(fileUrl: string): string {
  if (!fileUrl) return "";
  try {
    return decodeURIComponent(new URL(fileUrl).pathname);
  } catch {
    return fileUrl;
  }
}

/**
 * Parse raw pane entries into grouped tabs.
 */
export function parsePaneEntries(entries: WezTermPaneEntry[]): WezTermTab[] {
  const tabMap = new Map<number, WezTermTab>();

  for (const entry of entries) {
    const pane: WezTermPane = {
      paneId: entry.pane_id,
      title: entry.title,
      cwd: parseCwd(entry.cwd),
      isActive: entry.is_active,
      isZoomed: entry.is_zoomed,
      ttyName: entry.tty_name,
      size: entry.size,
    };

    const existing = tabMap.get(entry.tab_id);
    if (existing) {
      existing.panes.push(pane);
      if (entry.is_active) {
        existing.isActive = true;
      }
    } else {
      tabMap.set(entry.tab_id, {
        tabId: entry.tab_id,
        tabTitle: entry.tab_title || entry.title,
        windowId: entry.window_id,
        workspace: entry.workspace || "default",
        isActive: entry.is_active,
        panes: [pane],
      });
    }
  }

  return Array.from(tabMap.values());
}

/**
 * Group tabs by workspace.
 */
export function groupByWorkspace(tabs: WezTermTab[]): WezTermWorkspace[] {
  const workspaceMap = new Map<string, WezTermWorkspace>();

  for (const tab of tabs) {
    const existing = workspaceMap.get(tab.workspace);
    if (existing) {
      existing.tabs.push(tab);
      existing.tabCount += 1;
      existing.paneCount += tab.panes.length;
      if (tab.isActive) {
        existing.hasActiveTab = true;
      }
    } else {
      workspaceMap.set(tab.workspace, {
        name: tab.workspace,
        tabs: [tab],
        tabCount: 1,
        paneCount: tab.panes.length,
        hasActiveTab: tab.isActive,
      });
    }
  }

  return Array.from(workspaceMap.values()).sort((a, b) => {
    // Active workspace first, then alphabetical
    if (a.hasActiveTab && !b.hasActiveTab) return -1;
    if (!a.hasActiveTab && b.hasActiveTab) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Build the wezterm CLI list command.
 */
export function buildListCommand(): string {
  return `"${getWezTermBinary()}" cli list --format json`;
}

/**
 * Find an existing tab in a workspace whose pane's CWD matches the given directory.
 * Optionally excludes a specific tab (e.g. the currently selected one) from the search.
 * Returns the matching pane entry, or null if no match found.
 */
export function findExistingTab(workspace: string, cwd: string, excludeTabId?: number): WezTermPaneEntry | null {
  try {
    const output = execSync(`"${getWezTermBinary()}" cli list --format json`, {
      env: ENV,
      encoding: "utf-8",
    });
    const entries: WezTermPaneEntry[] = JSON.parse(output);
    return (
      entries.find((e) => {
        if (excludeTabId != null && e.tab_id === excludeTabId) return false;
        const entryCwd = parseCwd(e.cwd);
        return e.workspace === workspace && entryCwd === cwd;
      }) ?? null
    );
  } catch {
    return null;
  }
}

/**
 * Activate a specific pane (and its tab) by pane_id.
 */
export function activateTab(paneId: number): Promise<void> {
  return execCommand(`"${getWezTermBinary()}" cli activate-pane --pane-id ${paneId}`);
}

/**
 * Activate a specific pane by pane_id.
 */
export function activatePane(paneId: number): Promise<void> {
  return execCommand(`"${getWezTermBinary()}" cli activate-pane --pane-id ${paneId}`);
}

/**
 * Find the active pane ID from current WezTerm state.
 */
export function getPaneIdForWorkspace(workspace?: string): number | null {
  try {
    const output = execSync(`"${getWezTermBinary()}" cli list --format json`, {
      env: ENV,
      encoding: "utf-8",
    });
    const entries: WezTermPaneEntry[] = JSON.parse(output);
    if (workspace) {
      const match = entries.find((e) => e.workspace === workspace);
      if (match) return match.pane_id;
    }
    const active = entries.find((e) => e.is_active);
    return active?.pane_id ?? entries[0]?.pane_id ?? null;
  } catch {
    return null;
  }
}

export function spawnTab(cwd?: string, workspace?: string): Promise<string> {
  const binary = `"${getWezTermBinary()}"`;
  const args: string[] = [`${binary} cli spawn`];

  const paneId = getPaneIdForWorkspace(workspace);
  if (paneId != null) {
    args.push(`--pane-id ${paneId}`);
  }

  if (cwd) args.push(`--cwd "${cwd}"`);

  return execCommandWithOutput(args.join(" "));
}

/**
 * Set a tab's title.
 */
export function setTabTitle(tabId: number, title: string): Promise<void> {
  return execCommand(`"${getWezTermBinary()}" cli set-tab-title --tab-id ${tabId} "${title}"`);
}

/**
 * Kill a pane (closes tab if it's the last pane).
 */
export function killPane(paneId: number): Promise<void> {
  return execCommand(`"${getWezTermBinary()}" cli kill-pane --pane-id ${paneId}`);
}

/**
 * Rename a workspace.
 */
export function renameWorkspace(oldName: string, newName: string): Promise<void> {
  return execCommand(`"${getWezTermBinary()}" cli rename-workspace --workspace "${oldName}" "${newName}"`);
}

/**
 * Split a pane.
 */
export function splitPane(
  paneId: number,
  direction: "right" | "bottom" = "right",
  options?: { cwd?: string; percent?: number },
): Promise<string> {
  const args: string[] = [`"${getWezTermBinary()}" cli split-pane --pane-id ${paneId} --${direction}`];
  if (options?.percent) args.push(`--percent ${options.percent}`);
  if (options?.cwd) args.push(`--cwd "${options.cwd}"`);
  return execCommandWithOutput(args.join(" "));
}

export async function switchWorkspace(workspaceName: string): Promise<void> {
  const binary = getWezTermBinary();

  const output = execSync(`"${binary}" cli list --format json`, {
    env: ENV,
    encoding: "utf-8",
  });

  const entries: WezTermPaneEntry[] = JSON.parse(output);
  const targetPane = entries.find((e) => e.is_active && e.tty_name);

  if (!targetPane?.tty_name) {
    return;
  }

  // File-based IPC for workspace switching
  const ipcFile = `${process.env.HOME}/.wezterm-workspace-switch`;
  writeFileSync(ipcFile, workspaceName);
}

export async function createWorkspace(name: string, cwd?: string): Promise<string> {
  const binary = `"${getWezTermBinary()}"`;
  const args = [`${binary} cli spawn --new-window --workspace "${name}"`];
  if (cwd) args.push(`--cwd "${cwd}"`);
  return execCommandWithOutput(args.join(" "));
}

export async function deleteWorkspace(workspaceName: string): Promise<void> {
  const output = execSync(`"${getWezTermBinary()}" cli list --format json`, {
    env: ENV,
    encoding: "utf-8",
  });
  const entries: WezTermPaneEntry[] = JSON.parse(output);
  const panes = entries.filter((e) => e.workspace === workspaceName);
  for (const pane of panes) {
    await killPane(pane.pane_id);
  }
}

export function focusWezTerm(): void {
  try {
    execSync(
      `osascript -e 'tell application "System Events" to tell process "wezterm-gui" to set frontmost to true' -e 'tell application "WezTerm" to activate'`,
    );
  } catch {
    try {
      execSync('open -b "com.github.wez.wezterm"', { env: ENV });
    } catch {
      // ignore
    }
  }
}

function execCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(command, { env: ENV }, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function execCommandWithOutput(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { env: ENV, encoding: "utf-8" }, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}
