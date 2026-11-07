export type ProviderId =
  | "codex"
  | "claude"
  | "node"
  | "npm"
  | "pnpm"
  | "bun"
  | "uv"
  | "rustup"
  | "cargo"
  | "gradle"
  | "android"
  | "homebrew"
  | "xcode"
  | "simulator"
  | "cocoapods"
  | "swiftpm"
  | "docker"
  | "projects";

export type CleanupPolicy = "trash" | "command";
export type RiskLevel = "safe" | "review" | "high";

export interface CommandSpec {
  executable: string;
  args: string[];
  timeoutMs?: number;
}

export interface CleanupCandidate {
  id: string;
  providerId: ProviderId;
  section: string;
  title: string;
  subtitle: string;
  description: string;
  cleanupPolicy: CleanupPolicy;
  risk: RiskLevel;
  selectedByDefault: boolean;
  bytes?: number;
  modifiedAt?: Date;
  path?: string;
  command?: CommandSpec;
}

export interface ExcludedItem {
  id: string;
  title: string;
  subtitle: string;
  providerId: ProviderId;
  path?: string;
  addedAt: string;
}

export interface ProtectedItem {
  id: string;
  providerId: ProviderId;
  title: string;
  reason: string;
  path?: string;
}

export interface ScanIssue {
  providerId: ProviderId;
  message: string;
}

export interface ScanResult {
  candidates: CleanupCandidate[];
  issues: ScanIssue[];
  protectedItems?: ProtectedItem[];
}

export interface ScanContext {
  homeDirectory: string;
  projectRoots: string[];
  excludedCandidateIds?: ReadonlySet<string>;
  extraPath?: string;
  now?: Date;
  signal?: AbortSignal;
}

export interface CleanupProvider {
  id: ProviderId;
  scan(context: ScanContext): Promise<ScanResult>;
}

export interface CleanupResult {
  candidateId: string;
  status: "cleaned" | "failed" | "cancelled";
  bytes?: number;
  bytesReclaimed?: number;
  message?: string;
}

export interface CleanupHistoryItem extends CleanupResult {
  title: string;
  providerId: ProviderId;
  cleanupPolicy: CleanupPolicy;
}

export interface CleanupRun {
  id: string;
  startedAt: string;
  completedAt: string;
  items: CleanupHistoryItem[];
}
