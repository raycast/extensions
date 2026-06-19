import os from "node:os";

import type { LaunchConfig, LayoutPane, LayoutTab, PaneConfig, SplitDirection, WorkspaceLayout } from "./types";
import { expandHome, getDirectoryName } from "./paths";

export interface LaunchConfigToLayoutsOptions {
  /** When set (e.g. from Git List), cwd is handled by openWorkspace—no need to expand path here. */
  directoryOverride?: string;
}

/**
 * Converts YAML LaunchConfig to Ghostty AppleScript API WorkspaceLayout format.
 * Preserves the existing YAML structure: windows → tabs → layout (panes tree).
 * Matches the original keystroke-based recursion: first child merges into current pane, rest split.
 */
export function launchConfigToWorkspaceLayouts(
  config: LaunchConfig,
  options?: LaunchConfigToLayoutsOptions,
): { directory: string; layout: WorkspaceLayout }[] {
  const directoryOverride = options?.directoryOverride;

  return config.windows.map((window, windowIndex) => {
    const firstCwd = config.windows[windowIndex].tabs[0]?.layout.cwd;
    const directory = directoryOverride ? directoryOverride : firstCwd ? expandHome(firstCwd) : os.homedir();
    const tabs: LayoutTab[] = window.tabs.map((tab) => {
      const panes = flattenPaneConfig(tab.layout, true, "right");
      const workingDirectory = directoryOverride ? undefined : tab.layout.cwd ? expandHome(tab.layout.cwd) : undefined;
      const effectiveDirectory = workingDirectory ?? directory;

      return {
        panes,
        workingDirectory,
        title: tab.title?.trim() || getDirectoryName(effectiveDirectory),
      };
    });

    return {
      directory,
      layout: {
        id: `${config.name}-window-${windowIndex}`,
        title: config.name,
        windowTitle: getDirectoryName(directory),
        openInNewWindow: windowIndex > 0,
        tabs,
      },
    };
  });
}

/**
 * Flattens PaneConfig tree to LayoutPane[]. First child merges into current pane, rest split from previous.
 */
function flattenPaneConfig(
  pane: PaneConfig,
  isFirst = true,
  parentSplitDirection: SplitDirection = "right",
): LayoutPane[] {
  const result: LayoutPane[] = [];
  const command = buildPaneCommand(pane);
  const direction: SplitDirection =
    pane.split_direction === "horizontal"
      ? "down"
      : pane.split_direction === "vertical"
        ? "right"
        : parentSplitDirection;

  if (isFirst) {
    result.push({
      focus: true,
      command: command || undefined,
    });
  } else {
    result.push({
      split: direction,
      splitFrom: 0,
      command: command || undefined,
    });
  }

  if (pane.panes && pane.panes.length > 0) {
    for (let i = 0; i < pane.panes.length; i++) {
      const subPanes = flattenPaneConfig(pane.panes[i], i === 0, direction);
      const lastIndex = result.length - 1;

      if (i === 0) {
        result[lastIndex] = mergePanes(result[lastIndex], subPanes[0]);
        for (let j = 1; j < subPanes.length; j++) {
          result.push({
            ...subPanes[j],
            split: subPanes[j].split ?? direction,
            splitFrom: subPanes[j].splitFrom ?? result.length - 1,
          });
        }
      } else {
        for (let j = 0; j < subPanes.length; j++) {
          const sp = subPanes[j];
          const parentIndex = j === 0 ? lastIndex : result.length - 1;
          result.push({
            ...sp,
            split: sp.split ?? direction,
            splitFrom: sp.splitFrom ?? parentIndex,
          });
        }
      }
    }
  }

  return result;
}

function mergePanes(a: LayoutPane, b: LayoutPane): LayoutPane {
  const cmdA = a.command?.trim() || "";
  const cmdB = b.command?.trim() || "";
  const combined = [cmdA, cmdB].filter(Boolean).join(" && ");
  return {
    focus: a.focus ?? b.focus,
    command: combined || undefined,
  };
}

function buildPaneCommand(pane: PaneConfig): string {
  const parts: string[] = [];

  if (pane.commands && pane.commands.length > 0) {
    parts.push(...pane.commands.map((c) => c.exec));
  }

  return parts.join(" && ");
}
