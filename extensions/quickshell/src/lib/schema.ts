export const SCHEMA_VERSION = 1;

export const STORAGE_KEY = "quickshell-data";

export type TerminalApplication = "system" | "wt" | "conhost" | "it" | "terminal" | "iterm";

export type LaunchEntry = {
  id: string;
  label: string;
  terminal: string;
  wtProfile?: string | null;
  command?: string | null;
  runAsAdmin: boolean;
  isEnabled: boolean;
  order: number;
  taskType?: string;
};

/** One GUI companion app; mirrors Core CompanionAppEntry. */
export type CompanionAppEntry = {
  id: string;
  path: string;
  arguments?: string | null;
  openOnLaunch: boolean;
  order: number;
};

export type Workspace = {
  id: string;
  name: string;
  abbreviation?: string | null;
  directory: string;
  isPinned: boolean;
  pinOrder?: number | null;
  lastUsedUtc?: string | null;
  terminal: string;
  wtProfile?: string | null;
  command?: string | null;
  runAsAdmin: boolean;
  launches: LaunchEntry[];
  /** Ordered companion apps. When empty, synthesized from scalar companion fields. */
  companionApps?: CompanionAppEntry[];
  devServerUrl?: string | null;
  openDevServerOnLaunch?: boolean;
  repoUrl?: string | null;
  /** Mirrored from the primary (first) companion entry. */
  openCompanionAppOnLaunch?: boolean;
  companionAppPath?: string | null;
  companionAppArguments?: string | null;
};

/** Repository-owned trust metadata; never part of portable workspace content. */
export type WorkspaceSecurityMetadata = {
  isTrusted: boolean;
  revision: number;
};

export type StoredWorkspace = {
  content: Workspace;
  security: WorkspaceSecurityMetadata;
  revision: number;
};

export type MultiLaunchPresentation = "singleWindowTabs" | "separateWindows";

export type QuickShellSettings = {
  terminalApplication: TerminalApplication;
  defaultProfile: string;
  recentWorkspaceCount: number;
  multiLaunchPresentation: MultiLaunchPresentation;
  /** When true, refuse launch switch if the worktree is dirty and not already on the target branch. */
  blockDirtyBranchSwitch: boolean;
};

/** Layout row: workspace reference or a titled section separator (Raycast-local blob). */
export type LayoutWorkspaceEntry = {
  type: "workspace";
  workspaceId: string;
};

export type LayoutSeparatorEntry = {
  type: "separator";
  id: string;
  title?: string | null;
};

export type LayoutEntry = LayoutWorkspaceEntry | LayoutSeparatorEntry;

export type StoredData = {
  version: number;
  workspaces: Workspace[];
  settings: QuickShellSettings;
  workspaceSecurity?: Record<string, WorkspaceSecurityMetadata>;
  /** Worktree key (normalized toplevel path, lowercase) → target branch. Raycast-local only. */
  branchTargets?: Record<string, string>;
  /** Browse-order layout including optional section separators. */
  layoutEntries?: LayoutEntry[];
};

export const DEFAULT_SETTINGS: QuickShellSettings = {
  terminalApplication: "wt",
  defaultProfile: "__default__",
  recentWorkspaceCount: 8,
  multiLaunchPresentation: "singleWindowTabs",
  blockDirtyBranchSwitch: true,
};

export const DEFAULT_TERMINAL = "default";

export const TASK_TYPES = ["none", "api", "frontend", "services", "logs", "test", "build"] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export function createEmptyStoredData(): StoredData {
  return {
    version: SCHEMA_VERSION,
    workspaces: [],
    settings: { ...DEFAULT_SETTINGS },
    branchTargets: {},
    layoutEntries: [],
  };
}
