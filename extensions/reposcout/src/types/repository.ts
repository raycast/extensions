/**
 * Core domain types for RepoScout.
 *
 * These types are deliberately dependency-free so that every layer
 * (filesystem, git, cache, indexer, search, ranking, UI) can share the same
 * vocabulary without importing implementation code. See docs/ARCHITECTURE.md.
 */

/**
 * The kind of Git repository discovered on disk.
 *
 * - `normal`: a working tree with a `.git` directory.
 * - `worktree`: a linked worktree whose `.git` is a file pointing elsewhere.
 * - `bare`: a repository that is itself the Git database (no working tree).
 */
export type RepositoryKind = "normal" | "worktree" | "bare";

/**
 * The working-tree cleanliness of a repository.
 *
 * - `clean`: no uncommitted changes.
 * - `dirty`: staged, unstaged, or untracked changes are present.
 * - `unknown`: status could not be determined (e.g. bare repo or git failure).
 */
export type RepositoryStatus = "clean" | "dirty" | "unknown";

/**
 * A repository as located on the filesystem, before any Git metadata is read.
 * Produced by the `filesystem` layer.
 */
export interface DiscoveredRepository {
  /** Absolute path to the repository root (the directory containing `.git`). */
  readonly path: string;
  /** The basename of {@link path}, used as the primary display/search name. */
  readonly name: string;
  /** Repository kind detected purely from the filesystem shape. */
  readonly kind: RepositoryKind;
  /**
   * A cheap fingerprint of the repository's Git state, used to decide whether
   * cached Git metadata is still valid. Typically derived from the mtime of
   * `.git/HEAD` and `.git/index`. `null` when it could not be computed.
   */
  readonly fingerprint: string | null;
}

/**
 * Git metadata read from a repository by the `git` layer. Every field is
 * optional/nullable because any individual git command may fail on a broken,
 * bare, or permission-restricted repository without invalidating the others.
 */
export interface RepositoryGitInfo {
  /** Current branch name, or `null` when detached / undetermined. */
  readonly branch: string | null;
  /** Working-tree cleanliness. */
  readonly status: RepositoryStatus;
  /** Raw `origin` remote URL (ssh or https), or `null` when there is none. */
  readonly remoteUrl: string | null;
  /** Normalized https browse URL for the remote, or `null` when not derivable. */
  readonly remoteWebUrl: string | null;
  /** Unix seconds of the last commit, or `null` when unavailable. */
  readonly lastCommitAt: number | null;
}

/**
 * A fully-indexed repository record: filesystem identity plus Git metadata plus
 * bookkeeping. This is the unit stored in the cache and consumed by search.
 */
export interface RepositoryRecord extends DiscoveredRepository, RepositoryGitInfo {
  /** Unix milliseconds when this record's Git metadata was last refreshed. */
  readonly indexedAt: number;
}

/**
 * Per-repository user data that powers ranking signals such as favorites and
 * recency. Kept separate from {@link RepositoryRecord} so that re-indexing the
 * filesystem never destroys user intent. Keyed by repository path.
 */
export interface RepositoryUserData {
  /** Whether the user pinned this repository to the top of results. */
  readonly pinned: boolean;
  /** Whether the user marked this repository as a favorite. */
  readonly favorite: boolean;
  /** Unix milliseconds of the most recent time the user opened this repo. */
  readonly lastOpenedAt: number | null;
  /** Total number of times the user has opened this repo from RepoScout. */
  readonly openCount: number;
}

/** A repository joined with its user data, ready for ranking and display. */
export interface RankableRepository {
  readonly record: RepositoryRecord;
  readonly userData: RepositoryUserData;
}
