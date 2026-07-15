/** Package source types managed by WinGet. */
type WingetSource = "winget" | "msstore";

/** Row fields that winget's 120-column table renderer truncated with "…". */
type TruncatedField = "name" | "id" | "version" | "available";

/** Base package information from table commands. */
interface WingetPackage {
  name: string;
  id: string;
  version: string;
  source: WingetSource;
  /** Present when winget truncated one of the row's fields (see parser truncation policy). */
  truncatedFields?: TruncatedField[];
}

/** Package from `winget search`. */
interface WingetSearchPackage extends WingetPackage {
  source: WingetSource;
}

/** Package from `winget list` (installed). */
interface WingetInstalledPackage extends WingetPackage {
  available?: string;
}

/** Package from `winget upgrade`. */
interface WingetUpgradePackage extends WingetPackage {
  available: string;
  /**
   * True for rows from the "require explicit targeting" section of
   * `winget upgrade` output. Still upgradable: every upgrade we run targets
   * `--exact --id`, which is exactly the explicit targeting winget asks for.
   */
  requiresExplicitTargeting?: boolean;
}

/** Pinned package entry from `winget pin list`. */
interface WingetPinnedPackage {
  id: string;
  version?: string;
  source: WingetSource;
}

/** Detailed package information from `winget show`. */
interface WingetPackageDetails {
  id: string;
  name: string;
  version: string;
  publisher?: string;
  author?: string;
  moniker?: string;
  description?: string;
  homepage?: string;
  license?: string;
  releaseDate?: string;
  tags?: string[];
}

/** Available versions from `winget show --versions` (newest first). */
interface WingetVersionList {
  id: string;
  name: string;
  versions: string[];
}

/** Progress state parsed from streaming operation output. */
type WingetProgressState =
  | { type: "initializing" }
  | {
      type: "downloading";
      current: number;
      total: number;
      unit: "MB" | "GB" | "%";
    }
  | { type: "verifying" }
  | { type: "installing" }
  | { type: "uninstalling" }
  | { type: "repairing" }
  | { type: "complete"; success: boolean; message?: string };

/** Terminal result of a winget operation. */
interface WingetOperationResult {
  success: boolean;
  /** The operation had nothing to do (already installed / no upgrade / not pinned…). */
  noop?: boolean;
  /** Set if and only if the operation was aborted via the caller's signal. */
  cancelled?: boolean;
  message?: string;
  exitCode?: number;
  downloadPath?: string;
  errorCode?: string;
  installerLogPath?: string;
}

/** Options for operation commands (mutations). */
interface WingetExecutorOptions {
  timeout?: number;
  onProgress?: (state: WingetProgressState) => void;
  signal?: AbortSignal;
  /** Receives the spawned winget PID (lock orphan-detection registers it). */
  onSpawn?: (pid: number) => void;
}

/** Internal spawn options. */
interface SpawnWingetOptions {
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
  signal?: AbortSignal;
  timeout?: number;
  /** Arm the no-output stale watchdog (mutations only). */
  staleWatchdog?: boolean;
  onSpawn?: (pid: number) => void;
}

/** Raw result of a winget process run. */
interface ExecutorResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export {
  type ExecutorResult,
  type SpawnWingetOptions,
  type TruncatedField,
  type WingetExecutorOptions,
  type WingetInstalledPackage,
  type WingetOperationResult,
  type WingetPackage,
  type WingetPackageDetails,
  type WingetPinnedPackage,
  type WingetProgressState,
  type WingetSearchPackage,
  type WingetSource,
  type WingetUpgradePackage,
  type WingetVersionList,
};
