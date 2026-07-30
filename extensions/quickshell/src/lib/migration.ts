import {
  DEFAULT_SETTINGS,
  SCHEMA_VERSION,
  type LaunchEntry,
  type LayoutEntry,
  type QuickShellSettings,
  type StoredData,
  type Workspace,
  createEmptyStoredData,
} from "./schema";
import { createStableId, ensureStableId, isStableWorkspaceId } from "./ids";
import { parseTerminalApplication } from "./terminal-options";
import { normalizeLaunches, normalizeWorkspace } from "./validation";
import { isSafeGitBranchName } from "./git-launch-gate";

type UnknownRecord = Record<string, unknown>;

type MigrateOptions = {
  /**
   * When false, do not default missing workspaceSecurity to trusted. Used when restoring
   * from an external source (e.g. a reset-all backup) so missing security metadata cannot
   * silently grant trust.
   */
  defaultToTrusted?: boolean;
};

export function migrateStoredData(raw: unknown, options?: MigrateOptions): StoredData {
  if (!raw || typeof raw !== "object") {
    return createEmptyStoredData();
  }

  const record = raw as UnknownRecord;
  const version = typeof record.version === "number" ? record.version : 0;

  if (version > SCHEMA_VERSION) {
    throw new Error(`Unsupported Quick Shell data version: ${version}`);
  }

  const workspaces = Array.isArray(record.workspaces)
    ? record.workspaces
        .map((item) => migrateWorkspace(item))
        .filter((workspace): workspace is Workspace => workspace !== null)
    : [];

  const settings = migrateSettings(record.settings);

  const defaultToTrusted = options?.defaultToTrusted ?? true;

  const workspaceSecurity: Record<string, { isTrusted: boolean; revision: number }> = {};
  const rawSecurity = record.workspaceSecurity;
  if (rawSecurity && typeof rawSecurity === "object") {
    for (const [id, value] of Object.entries(rawSecurity as UnknownRecord)) {
      if (!value || typeof value !== "object") {
        continue;
      }
      const security = value as UnknownRecord;
      workspaceSecurity[id] = {
        isTrusted: defaultToTrusted ? security.isTrusted !== false : security.isTrusted === true,
        revision: typeof security.revision === "number" && security.revision > 0 ? security.revision : 1,
      };
    }
  }

  for (const workspace of workspaces) {
    workspaceSecurity[workspace.id] ??= { isTrusted: defaultToTrusted, revision: 1 };
  }

  const branchTargets = migrateBranchTargets(record.branchTargets);
  const layoutEntries = migrateLayoutEntries(record.layoutEntries, workspaces);

  const data: StoredData = {
    version: SCHEMA_VERSION,
    workspaces,
    settings,
    workspaceSecurity,
    branchTargets,
    layoutEntries,
  };

  return data;
}

export function synthesizeLayoutEntries(workspaces: Workspace[]): LayoutEntry[] {
  return workspaces.map((workspace) => ({ type: "workspace" as const, workspaceId: workspace.id }));
}

function migrateBranchTargets(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const targets: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as UnknownRecord)) {
    if (typeof value !== "string") {
      continue;
    }
    const trimmedKey = key.trim().toLowerCase();
    const trimmedValue = value.trim();
    if (!trimmedKey || !trimmedValue || !isSafeGitBranchName(trimmedValue)) {
      continue;
    }
    targets[trimmedKey] = trimmedValue;
  }
  return targets;
}

function migrateLayoutEntries(raw: unknown, workspaces: Workspace[]): LayoutEntry[] {
  if (!Array.isArray(raw)) {
    return synthesizeLayoutEntries(workspaces);
  }

  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));
  const seenWorkspaceIds = new Set<string>();
  const entries: LayoutEntry[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as UnknownRecord;
    const type = typeof record.type === "string" ? record.type.trim().toLowerCase() : "";

    if (type === "separator") {
      const id =
        typeof record.id === "string" && isStableWorkspaceId(record.id) ? record.id.toLowerCase() : createStableId();
      const title = typeof record.title === "string" && record.title.trim() ? record.title.trim() : null;
      entries.push({ type: "separator", id, title });
      continue;
    }

    if (type === "workspace" || type === "shortcut") {
      const rawId =
        typeof record.workspaceId === "string"
          ? record.workspaceId
          : typeof record.shortcutId === "string"
            ? record.shortcutId
            : "";
      if (!isStableWorkspaceId(rawId)) {
        continue;
      }
      const id = rawId.toLowerCase();
      if (!workspaceIds.has(id) || seenWorkspaceIds.has(id)) {
        continue;
      }
      seenWorkspaceIds.add(id);
      entries.push({ type: "workspace", workspaceId: id });
    }
  }

  for (const workspace of workspaces) {
    if (!seenWorkspaceIds.has(workspace.id)) {
      entries.push({ type: "workspace", workspaceId: workspace.id });
    }
  }

  return entries;
}

function migrateSettings(raw: unknown): QuickShellSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SETTINGS };
  }

  const {
    defaultProfile: defaultDefaultProfile,
    recentWorkspaceCount: defaultRecentWorkspaceCount,
    blockDirtyBranchSwitch: defaultBlockDirtyBranchSwitch,
  } = DEFAULT_SETTINGS;

  const record = raw as UnknownRecord;
  const {
    terminalApplication: rawTerminalApplication,
    defaultProfile: rawDefaultProfile,
    recentWorkspaceCount: rawRecentWorkspaceCount,
    multiLaunchPresentation: rawMultiLaunchPresentation,
    blockDirtyBranchSwitch: rawBlockDirtyBranchSwitch,
  } = record;

  const terminalApplication = parseTerminalApplication(rawTerminalApplication);
  const defaultProfile =
    typeof rawDefaultProfile === "string" && rawDefaultProfile.trim()
      ? rawDefaultProfile.trim()
      : defaultDefaultProfile;

  let recentWorkspaceCount = defaultRecentWorkspaceCount;
  if (typeof rawRecentWorkspaceCount === "number") {
    recentWorkspaceCount = normalizeRecentCount(rawRecentWorkspaceCount);
  } else if (typeof rawRecentWorkspaceCount === "string") {
    const parsed = Number.parseInt(rawRecentWorkspaceCount, 10);
    if (!Number.isNaN(parsed)) {
      recentWorkspaceCount = normalizeRecentCount(parsed);
    }
  }

  return {
    terminalApplication,
    defaultProfile,
    recentWorkspaceCount,
    multiLaunchPresentation: parseMultiLaunchPresentation(rawMultiLaunchPresentation),
    blockDirtyBranchSwitch: parseBooleanFlag(rawBlockDirtyBranchSwitch, defaultBlockDirtyBranchSwitch),
  };
}

function parseBooleanFlag(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") {
    return raw;
  }
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }
  return fallback;
}

function parseMultiLaunchPresentation(raw: unknown): QuickShellSettings["multiLaunchPresentation"] {
  if (typeof raw === "string" && raw.trim().toLowerCase() === "separatewindows") {
    return "separateWindows";
  }
  return DEFAULT_SETTINGS.multiLaunchPresentation;
}

function migrateWorkspace(raw: unknown): Workspace | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as UnknownRecord;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const directory = typeof record.directory === "string" ? record.directory.trim() : "";
  if (!name || !directory) {
    return null;
  }

  const launches = Array.isArray(record.launches)
    ? record.launches.map((entry) => migrateLaunchEntry(entry)).filter((entry): entry is LaunchEntry => entry !== null)
    : Array.isArray(record.entries)
      ? record.entries.map((entry) => migrateLaunchEntry(entry)).filter((entry): entry is LaunchEntry => entry !== null)
      : [];

  const workspace: Workspace = {
    id: ensureStableId(typeof record.id === "string" ? record.id : undefined),
    name,
    abbreviation: typeof record.abbreviation === "string" ? record.abbreviation : null,
    directory,
    isPinned: parseStrictBoolean(record.isPinned),
    pinOrder: typeof record.pinOrder === "number" ? record.pinOrder : null,
    lastUsedUtc: typeof record.lastUsedUtc === "string" ? record.lastUsedUtc : null,
    terminal: typeof record.terminal === "string" ? record.terminal : "default",
    wtProfile: typeof record.wtProfile === "string" ? record.wtProfile : null,
    command: typeof record.command === "string" ? record.command : null,
    runAsAdmin: parseStrictBoolean(record.runAsAdmin),
    launches,
    devServerUrl: typeof record.devServerUrl === "string" ? record.devServerUrl : null,
    openDevServerOnLaunch: parseStrictBoolean(record.openDevServerOnLaunch),
    repoUrl: typeof record.repoUrl === "string" ? record.repoUrl : null,
    openCompanionAppOnLaunch: parseStrictBoolean(record.openCompanionAppOnLaunch),
    companionAppPath: typeof record.companionAppPath === "string" ? record.companionAppPath : null,
    companionAppArguments: typeof record.companionAppArguments === "string" ? record.companionAppArguments : null,
    companionApps: Array.isArray(record.companionApps)
      ? record.companionApps
          .map((entry) => migrateCompanionEntry(entry))
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      : Array.isArray(record.CompanionApps)
        ? record.CompanionApps.map((entry) => migrateCompanionEntry(entry)).filter(
            (entry): entry is NonNullable<typeof entry> => entry !== null,
          )
        : undefined,
  };

  return normalizeWorkspace({
    ...workspace,
    launches: normalizeLaunches(workspace.launches, workspace),
  });
}

function migrateCompanionEntry(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as UnknownRecord;
  const path =
    (typeof record.path === "string" && record.path.trim()) ||
    (typeof record.Path === "string" && record.Path.trim()) ||
    "";
  if (!path) {
    return null;
  }

  return {
    id: ensureStableId(
      typeof record.id === "string" ? record.id : typeof record.Id === "string" ? record.Id : undefined,
    ),
    path,
    arguments:
      typeof record.arguments === "string"
        ? record.arguments
        : typeof record.Arguments === "string"
          ? record.Arguments
          : null,
    openOnLaunch:
      typeof record.openOnLaunch === "boolean"
        ? record.openOnLaunch
        : typeof record.OpenOnLaunch === "boolean"
          ? record.OpenOnLaunch
          : false,
    order: typeof record.order === "number" ? record.order : typeof record.Order === "number" ? record.Order : 0,
  };
}

function migrateLaunchEntry(raw: unknown): LaunchEntry | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as UnknownRecord;
  const label = typeof record.label === "string" ? record.label.trim() : "";
  if (!label) {
    return null;
  }

  return {
    id: ensureStableId(typeof record.id === "string" ? record.id : undefined),
    label,
    terminal: typeof record.terminal === "string" ? record.terminal : "default",
    wtProfile: typeof record.wtProfile === "string" ? record.wtProfile : null,
    command: typeof record.command === "string" ? record.command : null,
    runAsAdmin: parseStrictBoolean(record.runAsAdmin),
    isEnabled: record.isEnabled !== false,
    order: typeof record.order === "number" ? record.order : 0,
    taskType: typeof record.taskType === "string" ? record.taskType : "none",
  };
}

function parseStrictBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  return false;
}

export function normalizeRecentCount(value: number): number {
  if (value <= 0) {
    return 0;
  }
  return 8;
}

export function isRecentSectionEnabled(count: number): boolean {
  return normalizeRecentCount(count) > 0;
}

export function clampRecentDisplayCount(count: number): number {
  const normalized = normalizeRecentCount(count);
  return normalized <= 0 ? 0 : Math.min(normalized, 8);
}
