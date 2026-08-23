import type { GroundcrewLifecycleResult, GroundcrewStatusInventory, GroundcrewTask } from "../types/groundcrew";
import { GroundcrewClientError } from "./errors";
import { resolveCrewExecutable } from "./executable";
import { filterStatusByNaturalTaskId, parseLegacyStatusJson } from "./legacy-status";
import { type ProcessResult, runProcess } from "./process";
import { assertCompatibleVersion } from "./semver";
import { parseTaskJson, parseTaskListJson } from "./task-json";

export const MINIMUM_GROUNDCREW_VERSION = "4.50.3";

const DEFAULT_VERSION_TIMEOUT_MS = 5_000;

export interface CreateGroundcrewClientOptions {
  executablePath?: string;
  environment?: NodeJS.ProcessEnv;
  versionTimeoutMs?: number;
  /** Colon-separated directories prepended to PATH when running crew (and for discovery). */
  additionalPath?: string;
  /** Provided to crew as `GROUNDCREW_LINEAR_API_KEY`. */
  apiKey?: string;
}

export interface LifecycleOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface StopTaskOptions extends LifecycleOptions {
  reason?: string;
}

export interface ResumeTaskOptions extends LifecycleOptions {
  /** Start a fresh agent chat session instead of resuming the existing one. */
  newSession?: boolean;
}

export interface CleanupTaskOptions extends LifecycleOptions {
  /** Also remove a worktree with uncommitted changes. Off by default; the CLI otherwise refuses a dirty worktree. */
  force?: boolean;
}

export interface CleanupAllOptions extends LifecycleOptions {
  /** Also remove worktrees with uncommitted changes. Off by default; the CLI otherwise skips dirty worktrees. */
  force?: boolean;
}

export interface OpenWorkspaceOptions extends LifecycleOptions {
  /** Treat the target as a branch name (`crew open --branch <name>`) rather than a PR. */
  kind?: "pr" | "branch";
}

export interface GroundcrewClient {
  readonly executablePath: string;
  listTasks(): Promise<GroundcrewTask[]>;
  getTask(taskId: string): Promise<GroundcrewTask>;
  /** Always loads `crew status --json`; natural-task filtering happens after the full inventory is parsed. */
  getStatus(naturalTaskId?: string): Promise<GroundcrewStatusInventory>;
  startTask(taskId: string, options?: LifecycleOptions): Promise<GroundcrewLifecycleResult>;
  stopTask(taskId: string, options?: StopTaskOptions): Promise<GroundcrewLifecycleResult>;
  resumeTask(taskId: string, options?: ResumeTaskOptions): Promise<GroundcrewLifecycleResult>;
  cleanupTask(taskId: string, options?: CleanupTaskOptions): Promise<GroundcrewLifecycleResult>;
  cleanupAllTasks(options?: CleanupAllOptions): Promise<GroundcrewLifecycleResult>;
  completeTask(taskId: string, options?: LifecycleOptions): Promise<GroundcrewLifecycleResult>;
  openWorkspace(target: string, options?: OpenWorkspaceOptions): Promise<GroundcrewLifecycleResult>;
  runDoctor(options?: LifecycleOptions): Promise<GroundcrewLifecycleResult>;
}

function diagnostics(result: ProcessResult) {
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    ...(result.kind === "failure" ? { exitCode: result.exitCode } : {}),
  };
}

function conciseFailureDetail(result: ProcessResult): string {
  const detail = result.stderr.trim() || result.stdout.trim();
  if (detail.length === 0) {
    return "No diagnostic output was captured.";
  }
  const firstLine = detail.split("\n", 1)[0] ?? detail;
  return firstLine.length > 240 ? `${firstLine.slice(0, 237)}...` : firstLine;
}

function commandFailure(argv: readonly string[], result: ProcessResult): GroundcrewClientError {
  const description = `crew ${argv.join(" ")}`;
  switch (result.kind) {
    case "launch-failure":
      return new GroundcrewClientError("LAUNCH_FAILED", `Could not launch ${description}: ${result.error.message}`, {
        cause: result.error,
        diagnostics: diagnostics(result),
      });
    case "timeout":
      return new GroundcrewClientError("COMMAND_TIMEOUT", `${description} timed out.`, {
        diagnostics: diagnostics(result),
      });
    case "canceled":
      return new GroundcrewClientError("COMMAND_CANCELED", `${description} was canceled.`, {
        diagnostics: diagnostics(result),
      });
    case "failure":
      return new GroundcrewClientError(
        "COMMAND_FAILED",
        `${description} exited with ${result.exitCode === null ? `signal ${result.signal ?? "unknown"}` : `code ${result.exitCode}`}: ${conciseFailureDetail(result)}`,
        { diagnostics: diagnostics(result) },
      );
    case "success":
      throw new Error("A successful process cannot be converted to a command failure.");
  }
}

class InstalledGroundcrewClient implements GroundcrewClient {
  public readonly executablePath: string;
  readonly #environment: NodeJS.ProcessEnv;
  readonly #versionTimeoutMs: number;
  // Validated lazily on the first command and memoized, so `crew --version` runs
  // concurrently with the first data call rather than serially before it.
  #versionValidation?: Promise<string>;

  public constructor(executablePath: string, environment: NodeJS.ProcessEnv, versionTimeoutMs: number) {
    this.executablePath = executablePath;
    this.#environment = environment;
    this.#versionTimeoutMs = versionTimeoutMs;
  }

  #ensureCompatibleVersion(): Promise<string> {
    this.#versionValidation ??= validateGroundcrewVersion(
      this.executablePath,
      this.#environment,
      this.#versionTimeoutMs,
    );
    return this.#versionValidation;
  }

  async #runJson(argv: readonly string[]): Promise<string> {
    // Start the version check and the data call concurrently, but await the version
    // first so an incompatible-CLI error always takes precedence over the data result.
    const versionCheck = this.#ensureCompatibleVersion();
    const process = runProcess(this.executablePath, argv, { environment: this.#environment });
    process.catch(() => undefined);
    await versionCheck;
    const result = await process;
    if (result.kind !== "success") {
      throw commandFailure(argv, result);
    }
    return result.stdout;
  }

  async #runLifecycle(argv: readonly string[], options: LifecycleOptions = {}): Promise<GroundcrewLifecycleResult> {
    const versionCheck = this.#ensureCompatibleVersion();
    const process = runProcess(this.executablePath, argv, {
      environment: this.#environment,
      ...(options.signal === undefined ? {} : { signal: options.signal }),
      ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    });
    process.catch(() => undefined);
    await versionCheck;
    return await process;
  }

  public async listTasks(): Promise<GroundcrewTask[]> {
    return parseTaskListJson(await this.#runJson(["task", "list", "--json"]));
  }

  public async getTask(taskId: string): Promise<GroundcrewTask> {
    return parseTaskJson(await this.#runJson(["task", "get", taskId, "--json"]));
  }

  public async getStatus(naturalTaskId?: string): Promise<GroundcrewStatusInventory> {
    const normalized = naturalTaskId?.trim();
    if (naturalTaskId !== undefined && normalized?.length === 0) {
      throw new GroundcrewClientError("INVALID_ARGUMENT", "Status filtering requires a non-empty natural task ID.");
    }
    const inventory = parseLegacyStatusJson(await this.#runJson(["status", "--json"]));
    if (normalized === undefined) {
      return inventory;
    }
    return filterStatusByNaturalTaskId(inventory, normalized);
  }

  public async startTask(taskId: string, options: LifecycleOptions = {}): Promise<GroundcrewLifecycleResult> {
    return await this.#runLifecycle(["start", taskId], options);
  }

  public async stopTask(taskId: string, options: StopTaskOptions = {}): Promise<GroundcrewLifecycleResult> {
    const argv = ["stop", taskId, ...(options.reason === undefined ? [] : ["--reason", options.reason])];
    return await this.#runLifecycle(argv, options);
  }

  public async resumeTask(taskId: string, options: ResumeTaskOptions = {}): Promise<GroundcrewLifecycleResult> {
    const { newSession, ...lifecycleOptions } = options;
    return await this.#runLifecycle(["resume", ...(newSession === true ? ["--new"] : []), taskId], lifecycleOptions);
  }

  public async cleanupTask(taskId: string, options: CleanupTaskOptions = {}): Promise<GroundcrewLifecycleResult> {
    const { force, ...lifecycleOptions } = options;
    return await this.#runLifecycle(["cleanup", ...(force === true ? ["--force"] : []), taskId], lifecycleOptions);
  }

  public async cleanupAllTasks(options: CleanupAllOptions = {}): Promise<GroundcrewLifecycleResult> {
    const { force, ...lifecycleOptions } = options;
    return await this.#runLifecycle(["cleanup", "--all", ...(force === true ? ["--force"] : [])], lifecycleOptions);
  }

  public async completeTask(taskId: string, options: LifecycleOptions = {}): Promise<GroundcrewLifecycleResult> {
    return await this.#runLifecycle(["task", "done", taskId], options);
  }

  public async openWorkspace(target: string, options: OpenWorkspaceOptions = {}): Promise<GroundcrewLifecycleResult> {
    const { kind, ...lifecycleOptions } = options;
    const argv = kind === "branch" ? ["open", "--branch", target] : ["open", target];
    return await this.#runLifecycle(argv, lifecycleOptions);
  }

  public async runDoctor(options: LifecycleOptions = {}): Promise<GroundcrewLifecycleResult> {
    // Intentionally NOT version-gated: `doctor` is the tool you reach for when the
    // CLI is misconfigured or incompatible, so it must run regardless.
    return await runProcess(this.executablePath, ["doctor"], {
      environment: this.#environment,
      ...(options.signal === undefined ? {} : { signal: options.signal }),
      ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    });
  }
}

async function validateGroundcrewVersion(
  executablePath: string,
  environment: NodeJS.ProcessEnv,
  versionTimeoutMs: number,
): Promise<string> {
  const versionResult = await runProcess(executablePath, ["--version"], {
    environment,
    timeoutMs: versionTimeoutMs,
  });
  if (versionResult.kind !== "success") {
    throw commandFailure(["--version"], versionResult);
  }
  return assertCompatibleVersion(versionResult.stdout, MINIMUM_GROUNDCREW_VERSION);
}

/** Expands a leading `~`/`$HOME`/`${HOME}` in each colon-separated PATH segment. */
function expandPathSegments(value: string, home: string | undefined): string {
  return value
    .split(":")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      if (home === undefined || home.length === 0) {
        return segment;
      }
      if (segment === "~") {
        return home;
      }
      if (segment.startsWith("~/")) {
        return `${home}${segment.slice(1)}`;
      }
      return segment.replace(/\$\{HOME\}/g, home).replace(/\$HOME\b/g, home);
    })
    .join(":");
}

export async function createGroundcrewClient(options: CreateGroundcrewClientOptions = {}): Promise<GroundcrewClient> {
  const environment = { ...(options.environment ?? process.env) };
  // Inject the configured Additional PATH so crew (and the tools it shells out to —
  // node, gh, cmux, tmux) resolve under Raycast's stripped environment. Also feeds discovery.
  const extraPath = options.additionalPath?.trim();
  if (extraPath !== undefined && extraPath.length > 0) {
    const expanded = expandPathSegments(extraPath, environment.HOME);
    if (expanded.length > 0) {
      environment.PATH =
        environment.PATH === undefined || environment.PATH.length === 0 ? expanded : `${expanded}:${environment.PATH}`;
    }
  }
  // Provide the Linear API key so provider-backed commands work without a shell-sourced env.
  const apiKey = options.apiKey?.trim();
  if (apiKey !== undefined && apiKey.length > 0) {
    environment.GROUNDCREW_LINEAR_API_KEY = apiKey;
  }
  const executablePath = await resolveCrewExecutable({
    configuredPath: options.executablePath,
    environment,
  });
  // Compatibility is validated lazily on the first command (see `#ensureCompatibleVersion`)
  // so `crew --version` overlaps the first data call instead of blocking it.
  return new InstalledGroundcrewClient(
    executablePath,
    environment,
    options.versionTimeoutMs ?? DEFAULT_VERSION_TIMEOUT_MS,
  );
}
