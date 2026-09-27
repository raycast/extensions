import {
  COMPANION_PRESET_NONE,
  getCompanionPresetDefaultArguments,
  normalizeCompanionPresetForForm,
} from "./companion-catalog";
import { createStableId } from "./ids";
import { suggestionLabelForCommand } from "./project-setup-suggestion";
import type { CompanionAppEntry, LaunchEntry, Workspace } from "./schema";
import { SAME_AS_PREVIOUS_TERMINAL_ID } from "./terminal-catalog";
import { normalizeCompanionApps, normalizeWorkspace } from "./validation";

export type LaunchFormRow = {
  id: string;
  command: string;
  terminal: string;
  wtProfile?: string | null;
  runAsAdmin: boolean;
  isEnabled: boolean;
  label: string;
  taskType: string;
};

export type CompanionFormRow = {
  id: string;
  /** Dropdown value: none | custom | installed catalog id. */
  presetId: string;
  path: string;
  arguments: string;
  openOnLaunch: boolean;
};

export function createEmptyCompanionFormRow(): CompanionFormRow {
  return {
    id: createStableId(),
    presetId: COMPANION_PRESET_NONE,
    path: "",
    arguments: "",
    openOnLaunch: false,
  };
}

export type WorkspaceFormState = {
  name: string;
  abbreviation: string;
  directory: string;
  terminal: string;
  wtProfile?: string | null;
  isPinned: boolean;
  runAsAdmin: boolean;
  launches: LaunchFormRow[];
  companions: CompanionFormRow[];
  devServerUrl: string;
  openDevServerOnLaunch: boolean;
  repoUrl: string;
};

function savableLaunchRowCount(state: WorkspaceFormState): number {
  return state.launches.filter((row) => row.command.trim()).length;
}

function usesSharedLaunchControls(state: WorkspaceFormState): boolean {
  return savableLaunchRowCount(state) <= 1;
}

function terminalForLaunchRow(row: LaunchFormRow, state: WorkspaceFormState): string {
  if (usesSharedLaunchControls(state)) {
    return state.terminal || "default";
  }

  return row.terminal || state.terminal || "default";
}

function wtProfileForLaunchRow(row: LaunchFormRow, state: WorkspaceFormState): string | null {
  if (usesSharedLaunchControls(state)) {
    return state.wtProfile ?? null;
  }

  return row.wtProfile ?? state.wtProfile ?? null;
}

export function buildWorkspaceFromFormState(initialWorkspace: Workspace, state: WorkspaceFormState): Workspace {
  const launches: LaunchEntry[] = state.launches
    .filter((row) => row.command.trim())
    .map((row, index) => ({
      id: row.id || createStableId(),
      label: row.label.trim() || suggestionLabelForCommand(row.command, `Launch ${index + 1}`),
      terminal: terminalForLaunchRow(row, state),
      wtProfile: wtProfileForLaunchRow(row, state),
      command: row.command || null,
      runAsAdmin: usesSharedLaunchControls(state) ? state.runAsAdmin : row.runAsAdmin || state.runAsAdmin,
      isEnabled: row.isEnabled,
      order: index,
      taskType: row.taskType?.trim() || "none",
    }));

  const primary = launches.find((entry) => entry.isEnabled) ?? launches[0];

  const companionApps: CompanionAppEntry[] = state.companions
    .filter((row) => row.path.trim())
    .map((row, index) => ({
      id: row.id || createStableId(),
      path: row.path.trim(),
      arguments: row.arguments.trim() || null,
      openOnLaunch: row.openOnLaunch,
      order: index,
    }));
  const primaryCompanion = companionApps[0];

  return normalizeWorkspace({
    ...initialWorkspace,
    name: state.name.trim(),
    abbreviation: state.abbreviation.trim() || null,
    directory: state.directory.trim(),
    terminal: primary?.terminal ?? state.terminal,
    wtProfile: primary?.wtProfile ?? state.wtProfile ?? null,
    command: primary?.command ?? null,
    isPinned: state.isPinned,
    runAsAdmin: state.runAsAdmin || launches.some((launch) => launch.runAsAdmin),
    launches,
    companionApps,
    devServerUrl: state.devServerUrl?.trim() || null,
    openDevServerOnLaunch: state.openDevServerOnLaunch ?? false,
    repoUrl: state.repoUrl?.trim() || null,
    openCompanionAppOnLaunch: primaryCompanion?.openOnLaunch ?? false,
    companionAppPath: primaryCompanion?.path ?? null,
    companionAppArguments: primaryCompanion?.arguments ?? null,
  });
}

export function workspaceFormStateFromWorkspace(workspace: Workspace): WorkspaceFormState {
  const launches = workspace.launches.length
    ? workspace.launches.map((launch) => ({
        id: launch.id,
        command: launch.command ?? "",
        terminal: launch.terminal || workspace.terminal || "default",
        wtProfile: launch.wtProfile ?? workspace.wtProfile ?? null,
        runAsAdmin: launch.runAsAdmin,
        isEnabled: launch.isEnabled,
        label: launch.label,
        taskType: launch.taskType?.trim() || "none",
      }))
    : [
        {
          id: createStableId(),
          command: workspace.command ?? "",
          terminal: workspace.terminal || "default",
          wtProfile: workspace.wtProfile ?? null,
          runAsAdmin: workspace.runAsAdmin,
          isEnabled: true,
          label: workspace.name || "Launch",
          taskType: "none",
        },
      ];

  const primary = launches.find((launch) => launch.isEnabled) ?? launches[0];
  const companions = normalizeCompanionApps(workspace).map((entry) => {
    const path = entry.path;
    const presetId = normalizeCompanionPresetForForm(null, path);
    return {
      id: entry.id,
      presetId,
      path,
      arguments: entry.arguments ?? getCompanionPresetDefaultArguments(presetId),
      openOnLaunch: entry.openOnLaunch,
    };
  });

  return {
    name: workspace.name,
    abbreviation: workspace.abbreviation ?? "",
    directory: workspace.directory,
    terminal: primary?.terminal ?? workspace.terminal ?? "default",
    wtProfile: primary?.wtProfile ?? workspace.wtProfile ?? null,
    isPinned: workspace.isPinned,
    runAsAdmin: workspace.runAsAdmin || launches.some((launch) => launch.runAsAdmin),
    launches,
    companions,
    devServerUrl: workspace.devServerUrl ?? "",
    openDevServerOnLaunch: Boolean(workspace.openDevServerOnLaunch),
    repoUrl: workspace.repoUrl ?? "",
  };
}

export function launchRowsFromSuggestions(
  suggestions: Array<{ label: string; command: string; taskType?: string }>,
  terminal = "default",
): LaunchFormRow[] {
  return suggestions.map((suggestion, index) => ({
    id: createStableId(),
    command: suggestion.command,
    // Match CmdPal/Run: first real launch uses the seed target; later rows inherit.
    terminal: index === 0 ? terminal : SAME_AS_PREVIOUS_TERMINAL_ID,
    wtProfile: null,
    runAsAdmin: false,
    isEnabled: true,
    label: suggestion.label,
    taskType: suggestion.taskType?.trim() || "none",
  }));
}

/**
 * Apply a suggestion pill like Core LaunchRowListEditor.ApplyPill:
 * fill the first empty command row, otherwise append.
 */
export function applySuggestionPillToLaunchRows(
  rows: LaunchFormRow[],
  pill: { command: string; taskType: string; displayTitle?: string; typeTitle?: string },
  options?: { runAsAdmin?: boolean; firstLaunchTerminal?: string },
): LaunchFormRow[] {
  const command = pill.command.trim();
  if (!command) {
    return rows;
  }

  const label = (pill.displayTitle || pill.typeTitle || command).trim() || command;
  const taskType = pill.taskType?.trim() || "none";
  const emptyIndex = rows.findIndex((row) => !row.command.trim());
  if (emptyIndex >= 0) {
    return rows.map((row, index) =>
      index === emptyIndex
        ? {
            ...row,
            command,
            label,
            taskType,
            isEnabled: true,
          }
        : row,
    );
  }

  const terminal = terminalForAddedLaunch(rows, options?.firstLaunchTerminal ?? "default");
  return [
    ...rows,
    {
      id: createStableId(),
      command,
      terminal: terminal.terminal,
      wtProfile: terminal.wtProfile,
      runAsAdmin: options?.runAsAdmin ?? false,
      isEnabled: true,
      label,
      taskType,
    },
  ];
}

/**
 * Default terminal for Add command / suggestion-pill append.
 * First real launch → default (or caller fallback); later → same-as-previous.
 */
export function terminalForAddedLaunch(
  existingRows: Array<{ command: string }>,
  firstLaunchTerminal = "default",
): { terminal: string; wtProfile: null } {
  const hasRealLaunch = existingRows.some((row) => row.command.trim());
  return {
    terminal: hasRealLaunch ? SAME_AS_PREVIOUS_TERMINAL_ID : firstLaunchTerminal,
    wtProfile: null,
  };
}

export function filterWorkspacesForEdit(workspaces: Workspace[], query: string): Workspace[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return [...workspaces].sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
    );
  }

  return workspaces
    .filter((workspace) => {
      const haystacks = [
        workspace.name,
        workspace.abbreviation ?? "",
        workspace.directory,
        ...workspace.launches.map((launch) => `${launch.label} ${launch.command ?? ""}`),
      ];
      return haystacks.some((value) => value.toLowerCase().includes(trimmed));
    })
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
}

export function additionalLaunchCount(workspace: Workspace): number {
  return Math.max(0, workspace.launches.filter((entry) => entry.isEnabled).length - 1);
}

export type PillKeyPayload = {
  taskType: string;
  command: string;
};

export function encodePillKey(pill: PillKeyPayload): string {
  return JSON.stringify({ taskType: pill.taskType, command: pill.command });
}

export function decodePillKey(key: string): PillKeyPayload | undefined {
  try {
    const parsed = JSON.parse(key) as Partial<PillKeyPayload>;
    if (typeof parsed.taskType !== "string" || typeof parsed.command !== "string") {
      return undefined;
    }

    return { taskType: parsed.taskType, command: parsed.command };
  } catch {
    return undefined;
  }
}
