import { errorMessage } from "./exec.ts";
import { bundleKey } from "./filter.ts";
import type { RawRunningApp, RestartMode, RestartableApp } from "./types.ts";

export const QUIT_TIMEOUT_MS: Record<RestartMode, number> = { graceful: 15_000, force: 5_000 };
export const EXIT_POLL_INTERVAL_MS = 200;
const REOPEN_TIMEOUT_MS = 5_000;

export type TerminateOutcome = { status: "requested" } | { status: "refused" } | { status: "stale"; detail: string };

/** Side effects used by the coordinator; injected so the flow can be tested without macOS. */
export interface RestartDeps {
  /** Re-validates PID + exact paths, then asks AppKit to terminate. */
  terminate(app: RestartableApp, mode: RestartMode): Promise<TerminateOutcome>;
  isRunning(pid: number): Promise<boolean>;
  listRunning(): Promise<RawRunningApp[]>;
  open(bundlePath: string, options: { newInstance: boolean }): Promise<void>;
  sleep(ms: number): Promise<void>;
  now(): number;
}

export type RestartStage = "quitting" | "waiting" | "reopening";

export type RestartFailureReason =
  "busy" | "cancelled" | "stale" | "quitRefused" | "quitFailed" | "quitTimeout" | "reopenFailed";

export type RestartResult =
  | { ok: true; outcome: "relaunched" | "activatedExisting" | "quit" }
  | { ok: false; reason: RestartFailureReason; detail?: string };

export interface RestartRequest {
  mode: RestartMode;
  quitOnly?: boolean;
  /** Required for force restarts; resolving false cancels before anything is terminated. */
  confirm?: () => Promise<boolean>;
  onProgress?: (stage: RestartStage) => void;
}

/** Serializes restarts per bundle and runs validate → quit → wait → reopen. */
export class RestartCoordinator {
  private readonly deps: RestartDeps;
  private readonly busy = new Set<string>();

  constructor(deps: RestartDeps) {
    this.deps = deps;
  }

  isBusy(app: Pick<RestartableApp, "bundleId">): boolean {
    return this.busy.has(bundleKey(app));
  }

  async restart(app: RestartableApp, request: RestartRequest): Promise<RestartResult> {
    const key = bundleKey(app);
    if (this.busy.has(key)) return { ok: false, reason: "busy" };
    // Claim the bundle synchronously so a second request in the same tick is rejected.
    this.busy.add(key);
    try {
      if (request.mode === "force") {
        const confirmed = request.confirm ? await request.confirm() : false;
        if (!confirmed) return { ok: false, reason: "cancelled" };
      }
      return await this.run(app, request);
    } finally {
      this.busy.delete(key);
    }
  }

  private async run(app: RestartableApp, { mode, quitOnly, onProgress }: RestartRequest): Promise<RestartResult> {
    const { deps } = this;

    onProgress?.("quitting");
    let outcome: TerminateOutcome;
    try {
      outcome = await deps.terminate(app, mode);
    } catch (error) {
      return { ok: false, reason: "quitFailed", detail: errorMessage(error) };
    }
    if (outcome.status === "stale") return { ok: false, reason: "stale", detail: outcome.detail };
    if (outcome.status === "refused") return { ok: false, reason: "quitRefused" };

    onProgress?.("waiting");
    if (!(await this.waitForExit(app.pid, QUIT_TIMEOUT_MS[mode]))) {
      return { ok: false, reason: "quitTimeout" };
    }

    if (quitOnly) return { ok: true, outcome: "quit" };

    onProgress?.("reopening");
    let running: RawRunningApp[] = [];
    try {
      running = await deps.listRunning();
    } catch {
      // Without a snapshot we still reopen; LaunchServices handles the common case.
    }
    const live = running.filter((other) => !other.terminated && other.pid !== app.pid);
    // The same copy is already back (self-relaunch or a second instance): activate it instead of duplicating.
    const sameCopyRunning = live.some((other) => other.bundlePath === app.bundlePath);
    // A different copy with the same bundle ID would otherwise be activated in place of the selected one.
    const otherCopyRunning = live.some(
      (other) => other.bundleId?.toLowerCase() === bundleKey(app) && other.bundlePath !== app.bundlePath,
    );
    try {
      await deps.open(app.bundlePath, { newInstance: !sameCopyRunning && otherCopyRunning });
      if (!(await this.waitForReopen(app))) {
        return { ok: false, reason: "reopenFailed", detail: "The selected app did not appear after reopening." };
      }
    } catch (error) {
      return { ok: false, reason: "reopenFailed", detail: errorMessage(error) };
    }
    return { ok: true, outcome: sameCopyRunning ? "activatedExisting" : "relaunched" };
  }

  private async waitForReopen(app: RestartableApp): Promise<boolean> {
    const deadline = this.deps.now() + REOPEN_TIMEOUT_MS;
    do {
      const apps = await this.deps.listRunning();
      if (apps.some((other) => !other.terminated && other.pid !== app.pid && other.bundlePath === app.bundlePath)) {
        return true;
      }
      await this.deps.sleep(EXIT_POLL_INTERVAL_MS);
    } while (this.deps.now() < deadline);

    return false;
  }

  private async waitForExit(pid: number, timeoutMs: number): Promise<boolean> {
    const deadline = this.deps.now() + timeoutMs;
    while (this.deps.now() < deadline) {
      if (!(await this.deps.isRunning(pid))) return true;
      await this.deps.sleep(EXIT_POLL_INTERVAL_MS);
    }
    return !(await this.deps.isRunning(pid));
  }
}

export interface ResultText {
  title: string;
  message?: string;
}

/** User-facing toast copy for a finished restart. */
export function describeResult(
  app: Pick<RestartableApp, "name">,
  mode: RestartMode,
  result: RestartResult,
  quitOnly = false,
): ResultText {
  const { name } = app;
  if (result.ok) {
    if (result.outcome === "quit") return { title: `Quit ${name}` };
    return result.outcome === "activatedExisting"
      ? { title: `${name} Is Running`, message: "It was already reopened, so no duplicate was launched." }
      : { title: `Restarted ${name}` };
  }
  const seconds = QUIT_TIMEOUT_MS[mode] / 1000;
  switch (result.reason) {
    case "busy":
      return { title: `An Action Is Already Running for ${name}` };
    case "cancelled":
      return { title: "Force Restart Cancelled" };
    case "stale":
      return {
        title: `${name} Changed Since the List Loaded`,
        message: `Nothing was quit (${result.detail ?? "process changed"}). The list was refreshed.`,
      };
    case "quitRefused":
      return {
        title: `${name} Refused to Quit`,
        message: quitOnly
          ? undefined
          : mode === "graceful"
            ? "Try Force Restart."
            : "macOS declined the force quit request.",
      };
    case "quitFailed":
      return { title: `Couldn't Quit ${name}`, message: result.detail };
    case "quitTimeout":
      return mode === "graceful"
        ? {
            title: `${name} Didn't Quit`,
            message: `Still running after ${seconds}s, possibly waiting on unsaved changes.`,
          }
        : { title: `${name} Is Still Running`, message: `Force quit didn't finish within ${seconds}s.` };
    case "reopenFailed":
      return { title: `${name} Quit but Didn't Reopen`, message: result.detail };
  }
}
