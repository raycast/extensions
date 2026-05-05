export const STORAGE_VERSION = 1;

export interface ScanRoot {
  id: string;
  path: string;
  label: string;
  enabled: boolean;
  maxDepth?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GitRemote {
  name: string;
  rawUrl: string;
  url: string;
  host?: string;
}

export interface ProjectOverride {
  displayName?: string;
  description?: string;
  urls?: string[];
  pinned?: boolean;
  archived?: boolean;
  ideAppPath?: string;
  terminalAppPath?: string;
  updatedAt?: string;
}

export interface ProjectRecord extends Required<Pick<ProjectOverride, "pinned" | "archived">> {
  id: string;
  path: string;
  rootId: string;
  rootPath: string;
  rootLabel: string;
  directoryName: string;
  packageName?: string;
  isEmptyDirectory: boolean;
  frameworks: string[];
  languages: string[];
  gitRemotes: GitRemote[];
  urlsFromPackageMetadata: string[];
  lastScannedAt: string;
  displayName?: string;
  description?: string;
  urls: string[];
  ideAppPath?: string;
  terminalAppPath?: string;
}

export interface RuntimeProcess {
  pid: number;
  command: string;
  cwd: string;
  port: number;
  protocol: "tcp";
}

export interface RuntimeStatus {
  isActive: boolean;
  ports: number[];
  processes: RuntimeProcess[];
}

export interface RunningProjectProcess {
  id: string;
  project: ProjectRecord;
  process: RuntimeProcess;
  scopeName?: string;
  scopePath: string;
  scopeRelativePath: string;
}

export interface CleanupCandidate {
  path: string;
  relativePath: string;
  reason: string;
  ecosystem: string;
  sizeBytes?: number;
}

export interface StorageState {
  version: typeof STORAGE_VERSION;
  scanRoots: ScanRoot[];
  projectOverrides: Record<string, ProjectOverride>;
}

export type ProjectFilter = "all" | "pinned" | "archived" | `root:${string}`;

export interface ScanPreferences {
  initialScanRoot: string;
  additionalScanRoots?: string;
}

export interface PreferredApp {
  name: string;
  path: string;
}

export interface ResolvedProjectApp extends PreferredApp {
  source: "default" | "project";
}
