export type Protocol = "ssh" | "https";

export interface RemoteInfo {
  name: string;
  fetchUrl: string;
  pushUrl?: string;
}

export interface RepoStatus {
  branch: string;
  detached: boolean;
  upstream?: string;
  ahead: number;
  behind: number;
  staged: number;
  unstaged: number;
  untracked: number;
  conflicted: number;
  stashes: number;
}

export type RemoteCheckState =
  | "ok" // origin matches the repo's location under the root
  | "mismatch" // origin points somewhere else than the location implies
  | "no-origin" // remotes exist, but none is named origin
  | "no-remotes" // repo has no remotes at all (e.g. freshly created locally)
  | "unstructured" // path is not host/owner/repo, so no expected origin can be derived
  | "unknown"; // repo could not be inspected

export interface RemoteCheck {
  state: RemoteCheckState;
  /** Expected origin URL (in the default protocol), when derivable from the path. */
  expectedUrl?: string;
  /** Actual origin fetch URL, when present. */
  actualUrl?: string;
  message: string;
}

interface RepoEntryBase {
  name: string;
  /** Path relative to the repos root, POSIX separators, e.g. "github.com/lonetis/reponizer". */
  relativePath: string;
  fullPath: string;
  /** Section grouping, e.g. "github.com/lonetis". */
  group: string;
  sizeBytes?: number;
}

export interface Repo extends RepoEntryBase {
  kind: "repo";
  remotes: RemoteInfo[];
  origin?: RemoteInfo;
  status?: RepoStatus;
  remoteCheck: RemoteCheck;
  lastCommitAt?: string;
  /** Relative paths of other repos sharing the same normalized origin. */
  duplicateOf?: string[];
  /** Set when the repo could not be inspected (corrupt .git, git failure, …). */
  error?: string;
}

export interface OffloadedRepo extends RepoEntryBase {
  kind: "offloaded";
  originUrl: string;
  remotes: RemoteInfo[];
  branch?: string;
  offloadedAt?: string;
  /** Size on disk before the local copy was removed. */
  lastKnownSizeBytes?: number;
  /** Set when the placeholder file is unreadable or invalid. */
  error?: string;
}

export type RepoEntry = Repo | OffloadedRepo;

export interface RepoIndex {
  root: string;
  scannedAt: string;
  entries: RepoEntry[];
}
