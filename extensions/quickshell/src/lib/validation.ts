import { DEFAULT_TERMINAL, type CompanionAppEntry, type LaunchEntry, type Workspace } from "./schema";
import { createStableId } from "./ids";

const MAX_NAME_LENGTH = 120;
const MAX_ABBREVIATION_LENGTH = 32;
const MAX_DIRECTORY_LENGTH = 1024;
const MAX_COMMAND_LENGTH = 4000;
const MAX_PROFILE_LENGTH = 120;
const MAX_LAUNCHES = 50;
const MAX_COMPANIONS = 5;
const MAX_WORKSPACES = 500;

export type ValidationResult = { ok: true } | { ok: false; message: string };

export function validateWorkspace(workspace: Workspace): ValidationResult {
  const name = workspace.name?.trim() ?? "";
  if (!name) {
    return { ok: false, message: "Workspace name is required." };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      message: `Workspace name must be ${MAX_NAME_LENGTH} characters or fewer.`,
    };
  }

  const abbreviation = workspace.abbreviation?.trim() ?? "";
  if (abbreviation.length > MAX_ABBREVIATION_LENGTH) {
    return {
      ok: false,
      message: `Abbreviation must be ${MAX_ABBREVIATION_LENGTH} characters or fewer.`,
    };
  }

  const directory = workspace.directory?.trim() ?? "";
  if (!directory) {
    return { ok: false, message: "Workspace directory is required." };
  }
  if (directory.length > MAX_DIRECTORY_LENGTH) {
    return {
      ok: false,
      message: `Directory must be ${MAX_DIRECTORY_LENGTH} characters or fewer.`,
    };
  }
  if (!isAbsoluteDirectory(directory)) {
    return { ok: false, message: "Directory must be an absolute path." };
  }

  const commandResult = validateCommand(workspace.command);
  if (!commandResult.ok) {
    return commandResult;
  }

  const profileResult = validateProfile(workspace.wtProfile);
  if (!profileResult.ok) {
    return profileResult;
  }

  return validateLaunches(workspace.launches);
}

export function validateLaunches(launches: LaunchEntry[]): ValidationResult {
  if (launches.length === 0) {
    return { ok: false, message: "At least one launch entry is required." };
  }
  if (launches.length > MAX_LAUNCHES) {
    return {
      ok: false,
      message: `A workspace can have at most ${MAX_LAUNCHES} launch entries.`,
    };
  }

  const enabled = launches.filter((entry) => entry.isEnabled);
  if (enabled.length === 0) {
    return { ok: false, message: "At least one launch entry must be enabled." };
  }

  const labels = new Set<string>();
  for (const launch of launches) {
    const label = launch.label?.trim() ?? "";
    if (!label) {
      return { ok: false, message: "Each launch entry needs a label." };
    }
    if (label.length > MAX_NAME_LENGTH) {
      return {
        ok: false,
        message: `Launch label must be ${MAX_NAME_LENGTH} characters or fewer.`,
      };
    }

    const normalizedLabel = label.toLowerCase();
    if (labels.has(normalizedLabel)) {
      return { ok: false, message: `Duplicate launch label: ${label}` };
    }
    labels.add(normalizedLabel);

    const commandResult = validateCommand(launch.command);
    if (!commandResult.ok) {
      return commandResult;
    }

    const profileResult = validateProfile(launch.wtProfile);
    if (!profileResult.ok) {
      return profileResult;
    }
  }

  return { ok: true };
}

export function validateCommand(command: string | null | undefined): ValidationResult {
  if (!command) {
    return { ok: true };
  }
  if (command.length > MAX_COMMAND_LENGTH) {
    return {
      ok: false,
      message: `Command must be ${MAX_COMMAND_LENGTH} characters or fewer.`,
    };
  }
  if (/[\r\n\0]/.test(command)) {
    return {
      ok: false,
      message: "Command cannot contain line breaks or null characters.",
    };
  }
  return { ok: true };
}

export function validateProfile(profile: string | null | undefined): ValidationResult {
  if (!profile) {
    return { ok: true };
  }
  if (profile.length > MAX_PROFILE_LENGTH) {
    return {
      ok: false,
      message: `Profile must be ${MAX_PROFILE_LENGTH} characters or fewer.`,
    };
  }
  if (/[\r\n]/.test(profile)) {
    return { ok: false, message: "Profile cannot contain line breaks." };
  }
  return { ok: true };
}

export function validateWorkspaceCount(count: number): ValidationResult {
  if (count > MAX_WORKSPACES) {
    return {
      ok: false,
      message: `Quick Shell supports at most ${MAX_WORKSPACES} workspaces.`,
    };
  }
  return { ok: true };
}

export function isAbsoluteDirectory(directory: string): boolean {
  if (/^\\\\wsl\$\\/i.test(directory)) {
    return true;
  }
  if (/^[a-zA-Z]:[\\/]/.test(directory)) {
    return true;
  }
  if (directory.startsWith("/")) {
    return true;
  }
  return false;
}

export function normalizeWorkspace(workspace: Workspace): Workspace {
  const launches = normalizeLaunches(workspace.launches, workspace);
  const firstEnabled = launches.find((entry) => entry.isEnabled);
  const companionApps = normalizeCompanionApps(workspace);
  const primaryCompanion = companionApps[0];

  return {
    ...workspace,
    name: workspace.name.trim(),
    abbreviation: workspace.abbreviation?.trim() || null,
    directory: workspace.directory.trim(),
    terminal: workspace.terminal?.trim() || DEFAULT_TERMINAL,
    wtProfile: workspace.wtProfile?.trim() || null,
    command: firstEnabled?.command ?? workspace.command ?? null,
    launches,
    companionApps,
    openCompanionAppOnLaunch: primaryCompanion?.openOnLaunch ?? false,
    companionAppPath: primaryCompanion?.path ?? null,
    companionAppArguments: primaryCompanion?.arguments ?? null,
  };
}

/** Dual-read: list if present, else synthesize from legacy scalar companion fields. */
export function normalizeCompanionApps(workspace: Workspace): CompanionAppEntry[] {
  const fromList = [...(workspace.companionApps ?? [])]
    .sort((left, right) => left.order - right.order)
    .filter((entry) => entry?.path?.trim())
    .map((entry, index) => ({
      id: entry.id?.trim() || createStableId(),
      path: entry.path.trim(),
      arguments: entry.arguments || null,
      openOnLaunch: Boolean(entry.openOnLaunch),
      order: index,
    }))
    .slice(0, MAX_COMPANIONS);

  if (fromList.length > 0) {
    return fromList;
  }

  const path = workspace.companionAppPath?.trim();
  if (!path) {
    return [];
  }

  return [
    {
      id: createStableId(),
      path,
      arguments: workspace.companionAppArguments || null,
      openOnLaunch: Boolean(workspace.openCompanionAppOnLaunch),
      order: 0,
    },
  ];
}

export function getOpenOnLaunchCompanions(workspace: Workspace): CompanionAppEntry[] {
  return normalizeCompanionApps(workspace).filter((entry) => entry.openOnLaunch);
}

export function normalizeLaunches(launches: LaunchEntry[], workspace: Workspace): LaunchEntry[] {
  if (launches.length === 0) {
    return [
      {
        id: workspace.id,
        label: workspace.name || "Launch",
        terminal: workspace.terminal || DEFAULT_TERMINAL,
        wtProfile: workspace.wtProfile ?? null,
        command: workspace.command ?? null,
        runAsAdmin: workspace.runAsAdmin,
        isEnabled: true,
        order: 0,
        taskType: "none",
      },
    ];
  }

  const sorted = [...launches].sort((left, right) => left.order - right.order);
  return sorted.map((entry, index) => ({
    ...entry,
    label: entry.label.trim(),
    terminal: entry.terminal?.trim() || DEFAULT_TERMINAL,
    wtProfile: entry.wtProfile?.trim() || null,
    command: entry.command || null,
    order: index,
    taskType: entry.taskType?.trim() || "none",
  }));
}

export const VALIDATION_LIMITS = {
  MAX_NAME_LENGTH,
  MAX_ABBREVIATION_LENGTH,
  MAX_DIRECTORY_LENGTH,
  MAX_COMMAND_LENGTH,
  MAX_PROFILE_LENGTH,
  MAX_LAUNCHES,
  MAX_COMPANIONS,
  MAX_WORKSPACES,
};
