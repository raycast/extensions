export type PackageManagerName = "npm" | "yarn" | "pnpm" | "bun";

export type DependencyKind = "dependencies" | "devDependencies" | "peerDependencies" | "optionalDependencies";

export type InstallDependencyType = "prod" | "dev" | "optional" | "peer";

export type SemverBump = "major" | "minor" | "patch" | "prerelease" | "unknown";

export type AuditSeverity = "critical" | "high" | "moderate" | "low" | "info";

export type ScriptCategory = "dev" | "build" | "test" | "lint" | "format" | "typecheck" | "deploy" | "clean" | "other";

export type TerminalApp = "Terminal" | "iTerm" | "Warp" | "Ghostty" | "Alacritty" | "Kitty";

export interface PackageLinks {
  npm?: string;
  homepage?: string;
  repository?: string;
  bugs?: string;
}

export interface PackagePerson {
  name?: string;
  username?: string;
  email?: string;
}

export interface NpmSearchResult {
  name: string;
  scope?: string;
  version: string;
  description: string;
  keywords: string[];
  date: string;
  links: PackageLinks;
  author?: PackagePerson;
  publisher?: PackagePerson;
  maintainers: PackagePerson[];
  score: {
    final: number;
    detail: {
      quality: number;
      popularity: number;
      maintenance: number;
    };
  };
  weeklyDownloads?: number;
}

export interface PackageVersionEntry {
  version: string;
  publishedAt?: string;
  distTag?: string;
  deprecated?: string;
}

export interface NpmPackageDetail {
  name: string;
  description: string;
  latestVersion: string;
  distTags: Record<string, string>;
  versions: PackageVersionEntry[];
  license: string;
  homepage?: string;
  repositoryUrl?: string;
  bugsUrl?: string;
  npmUrl: string;
  releasesUrl?: string;
  changelogUrl?: string;
  readme: string;
  keywords: string[];
  maintainers: PackagePerson[];
  author?: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  unpackedSize?: number;
  fileCount?: number;
  hasTypes: boolean;
  deprecated?: string;
  lastPublished?: string;
  weeklyDownloads?: number;
  monthlyDownloads?: number;
}

export interface ProjectDependency {
  name: string;
  declaredRange: string;
  installedVersion?: string;
  kind: DependencyKind;
  wantedVersion?: string;
  latestVersion?: string;
  bump?: SemverBump;
}

export interface ProjectScript {
  name: string;
  command: string;
  category: ScriptCategory;
  isLongRunning: boolean;
}

export interface LocalProject {
  id: string;
  name: string;
  version?: string;
  description?: string;
  path: string;
  packageJsonPath: string;
  packageManager: PackageManagerName;
  packageManagerSource: "lockfile" | "packageManagerField" | "default";
  lockfileName?: string;
  isMonorepo: boolean;
  workspacesCount: number;
  nodeEngine?: string;
  dependencies: ProjectDependency[];
  scripts: ProjectScript[];
  counts: {
    dependencies: number;
    devDependencies: number;
    peerDependencies: number;
    optionalDependencies: number;
    total: number;
  };
  isPinned?: boolean;
  isCustom?: boolean;
  lastModified: number;
}

export interface OutdatedPackage {
  name: string;
  current: string;
  wanted: string;
  latest: string;
  bump: SemverBump;
  dependencyType: DependencyKind | "global";
  homepage?: string;
  isGlobal?: boolean;
}

export interface SecurityFixInfo {
  name: string;
  version: string;
  isSemVerMajor: boolean;
}

export interface SecurityVulnerability {
  id: string;
  packageName: string;
  title: string;
  severity: AuditSeverity;
  vulnerableRange: string;
  patchedVersions?: string;
  url?: string;
  cves: string[];
  fixAvailable: boolean | SecurityFixInfo;
  via: string[];
  isDirect: boolean;
}

export interface AuditReport {
  projectPath: string;
  packageManager: PackageManagerName;
  timestamp: number;
  total: number;
  counts: Record<AuditSeverity, number>;
  vulnerabilities: SecurityVulnerability[];
  source: "cli" | "registry-advisory";
  isPartial?: boolean;
  partialReason?: string;
  scannedPackageCount?: number;
  rawError?: string;
}

export interface GlobalPackage {
  name: string;
  version: string;
  packageManager: PackageManagerName;
  latestVersion?: string;
  bump?: SemverBump;
  homepage?: string;
}

export interface FavoritePackage {
  name: string;
  description: string;
  version: string;
  addedAt: number;
  links?: PackageLinks;
}

export type HistoryActionType = "install" | "uninstall" | "update" | "reinstall" | "audit-fix" | "script";

export interface HistoryEntry {
  id: string;
  timestamp: number;
  action: HistoryActionType;
  packageName?: string;
  version?: string;
  projectPath?: string;
  projectName?: string;
  isGlobal: boolean;
  packageManager: PackageManagerName;
  command: string;
  args?: string[];
  success: boolean;
  durationMs: number;
  errorMessage?: string;
}

export interface ScriptExecutionResult {
  scriptName: string;
  command: string;
  fullCommand: string;
  projectPath: string;
  projectName: string;
  packageManager: PackageManagerName;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  startedAt: number;
  timedOut?: boolean;
}

export interface PackageManagerInfo {
  name: PackageManagerName;
  installed: boolean;
  version?: string;
  binaryPath?: string;
}

export interface ProjectHealthSnapshot {
  projectPath: string;
  projectName: string;
  packageManager: PackageManagerName;
  outdatedCount: number;
  majorOutdatedCount: number;
  vulnerabilityCount: number;
  criticalOrHighCount: number;
  checkedAt: number;
  outdatedError?: string;
  auditError?: string;
  lastError?: string;
}
