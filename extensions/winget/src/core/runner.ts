/**
 * The operation engine, executed inside the no-view runner command (Lane B)
 * or directly in a view worker for fast bounded operations (Lane A).
 *
 * Invariants:
 * - Exactly one mutation at a time, machine-wide, enforced by the op-lock with
 *   heartbeats. The lock is acquired BEFORE any other work, so a second launch
 *   fails instantly with feedback instead of doing minutes of index work
 *   before discovering it is not allowed to run.
 * - Fencing: if the heartbeat finds the lock missing or foreign — or detects
 *   its own beat gap exceeded staleness (system sleep/stall) — this runner
 *   kills its winget child, records "interrupted" in HISTORY ONLY, and touches
 *   nothing else: not the lock, not op-state (owned by the new holder), not
 *   the index, not the cancel file.
 * - All index writes go through the index-write mutex. Long operations keep
 *   the op-lock through the authoritative refresh (no mutation can interleave
 *   with the snapshot, fence re-checked before commit); FAST operations
 *   (pin/unpin/export) finalize and release FIRST, then refresh best-effort
 *   outside the lock with epoch fencing — a 1-2 s pin must not hold the
 *   machine-wide lock through a multi-query refresh tail, especially in a
 *   view worker that dies on Escape.
 * - One toast, owned here. The heartbeat re-asserts it (the platform
 *   force-closes pending toasts on window deactivation; any property update
 *   re-opens one) and also re-asserts op-state (heals clobbers, keeps
 *   updatedAt fresh through silent installer phases). The terminal flip is
 *   awaited before the command's promise resolves.
 */

import { randomUUID } from "node:crypto";

import { Alert, confirmAlert, showToast, Toast } from "@raycast/api";

import {
  downloadInstaller,
  exportPackages,
  fetchMutableData,
  importPackages,
  installPackage,
  installPackageVersion,
  isModifiedPortableFailure,
  pinPackage,
  repairPackage,
  uninstallPackage,
  unpinPackage,
  upgradePackage,
} from "../cli/commands";
import { type WingetExecutorOptions, type WingetOperationResult } from "../cli/types";

import { finalizeOperationToast, operationTitle, progressMessage, showBusyToast, showOperationToast } from "./feedback";
import { cleanupOrphanTempFiles } from "./files";
import { applyOperationPatch } from "./index-patches";
import {
  bumpMutationEpoch,
  currentMutationEpoch,
  loadIndex,
  markUpdateNotApplicable,
  packageKey,
  patchMutable,
  type IndexPaths,
} from "./index-store";
import {
  acquireLock,
  DEFAULT_ENV,
  HEARTBEAT_MS,
  heartbeatLock,
  registerWingetPid,
  releaseLock,
  STALE_MS,
} from "./lock";
import {
  acknowledgeFailure,
  appendOperationHistory,
  clearCancelRequest,
  createOperationRequest,
  inspectOperationGate,
  isCancelRequested,
  type OperationKind,
  type OperationRequest,
  type OperationState,
  type OperationStatus,
  type PackageTarget,
  writeOperationState,
} from "./operations";
import { supportPath } from "./paths";
import { refreshSlicesIncrementally } from "./refresh";

const CANCEL_POLL_MS = 500;
const STATE_WRITE_THROTTLE_MS = 250;

/** Operation kinds with per-package optimistic index effects. */
const PATCHABLE_KINDS: ReadonlySet<OperationKind> = new Set([
  "install",
  "install-version",
  "upgrade",
  "uninstall",
  "pin",
  "unpin",
]);

/** Lane-A kinds: bounded seconds — finalize and release before any refresh. */
const FAST_KINDS: ReadonlySet<OperationKind> = new Set(["pin", "unpin", "export"]);

/** Kinds that cannot change package state — no post-operation refresh. */
const NO_REFRESH_KINDS: ReadonlySet<OperationKind> = new Set(["download", "export"]);

function getIndexPaths(): IndexPaths {
  return {
    indexPath: supportPath("index"),
    writeLockPath: supportPath("indexWriteLock"),
  };
}

type SingleOperationKind = Exclude<OperationKind, "upgrade-all" | "uninstall-all" | "import" | "export">;

function runSingleCliOperation(
  kind: SingleOperationKind,
  target: PackageTarget,
  version: string | undefined,
  options: WingetExecutorOptions,
  force = false,
): Promise<WingetOperationResult> {
  switch (kind) {
    case "install":
      return installPackage(target.id, target.source, options);
    case "install-version":
      return installPackageVersion(target.id, version ?? "", target.source, options);
    case "upgrade":
      return upgradePackage(target.id, target.source, options);
    case "uninstall":
      return uninstallPackage(target.id, target.source, options, version, force);
    case "repair":
      return repairPackage(target.id, target.source, options);
    case "download":
      return downloadInstaller(target.id, target.source, options);
    case "pin":
      return pinPackage(target.id, target.source, options);
    case "unpin":
      return unpinPackage(target.id, target.source, options);
  }
}

function statusFromResult(result: WingetOperationResult): OperationStatus {
  if (result.cancelled) return "cancelled";
  if (!result.success) return "failed";
  return result.noop ? "noop" : "succeeded";
}

/**
 * A targeted upgrade that no-ops while winget's own upgrade list still offers
 * a version is the "no applicable upgrade" contradiction: winget's list is a
 * naive version comparison, but the actual install found no installer
 * matching this system. Record the refused version so the row stops showing
 * as upgradable; the marker clears itself when a different version appears
 * (reconciled on every mutable commit). Returns the hidden version, or null
 * when the package was simply up to date.
 */
function markNotApplicableIfListed(indexPaths: IndexPaths, target: PackageTarget): string | null {
  const row = loadIndex(indexPaths)?.upgradable.find((u) => packageKey(u) === packageKey(target));
  if (!row) {
    return null;
  }
  markUpdateNotApplicable(indexPaths, DEFAULT_ENV, target, row.available);
  return row.available;
}

/**
 * Run one operation request end-to-end. Returns the terminal state, or null
 * when the operation never started (busy / orphan refusal).
 */
async function runOperation(request: OperationRequest): Promise<OperationState | null> {
  const opId = randomUUID();
  const lockPath = supportPath("opLock");
  const indexPaths = getIndexPaths();

  cleanupOrphanTempFiles(lockPath);

  // 1. The lock comes first — before any feedback, work, or index access.
  const acquired = acquireLock(lockPath, {
    opId,
    kind: request.kind,
    title: request.title,
  });
  if (acquired.status === "busy") {
    await showBusyToast(acquired.holder?.title);
    return null;
  }
  if (acquired.status === "orphan-winget-running") {
    await showToast({
      style: Toast.Style.Failure,
      title: "An interrupted operation is still finishing",
      message: `${acquired.holder.title}. Try again in a moment`,
    });
    return null;
  }

  // Finalize the reaped predecessor; its result is unknown.
  if (acquired.reaped) {
    appendOperationHistory({
      opId: acquired.reaped.opId,
      requestId: "",
      kind: acquired.reaped.kind as OperationKind,
      title: acquired.reaped.title,
      stage: "interrupted",
      status: "interrupted",
      errorMessage: "Raycast stopped before the operation finished, its result is unknown",
      startedAt: acquired.reaped.startedAt,
      updatedAt: Date.now(),
      finishedAt: Date.now(),
    });
  }

  const controller = new AbortController();
  let fenced = false;
  let cancelling = false;
  let releasedEarly = false;

  const state: OperationState = {
    opId,
    requestId: request.requestId,
    kind: request.kind,
    title: request.title,
    target: request.target,
    stage: "starting",
    status: "running",
    startedAt: Date.now(),
    updatedAt: Date.now(),
  };

  let lastStateWrite = 0;
  let toast: Toast | null = null;

  const publish = (patch: Partial<OperationState>, options: { force?: boolean } = {}) => {
    if (fenced) {
      // op-state now belongs to whoever reaped us; never write over it.
      return;
    }
    Object.assign(state, patch);
    const now = Date.now();
    if (options.force || now - lastStateWrite >= STATE_WRITE_THROTTLE_MS) {
      lastStateWrite = now;
      writeOperationState(state);
    }
    if (toast && !cancelling) {
      toast.title = state.title;
      toast.message = state.message;
    }
  };

  const selfFence = () => {
    fenced = true;
    controller.abort();
  };

  let lastBeatAt = Date.now();
  const heartbeatTimer = setInterval(() => {
    if (fenced || releasedEarly) {
      return;
    }
    // Sleep/stall detection: if our own beats gapped past staleness, a reaper
    // may own the lock now — verify before acting.
    const gap = Date.now() - lastBeatAt;
    lastBeatAt = Date.now();
    if (gap > STALE_MS || heartbeatLock(lockPath, opId) === "fenced") {
      if (gap > STALE_MS && heartbeatLock(lockPath, opId) === "ok") {
        return; // gapped, but nobody reaped us — carry on
      }
      selfFence();
      return;
    }
    // Keepalive: re-assert toast AND op-state (heals platform force-closes
    // and any clobber; keeps updatedAt fresh through silent installer phases).
    writeOperationState(state);
    if (toast) {
      toast.title = cancelling ? `Cancelling: ${state.title}` : state.title;
    }
  }, HEARTBEAT_MS);

  // Set when execution falls back to an elevated relaunch: the elevated child
  // cannot be killed from this unelevated process, so honouring a cancel would
  // only orphan it while releasing the lock.
  let elevatedPhase = false;

  const cancelTimer = setInterval(() => {
    if (elevatedPhase) {
      return;
    }
    if (!fenced && !cancelling && isCancelRequested(opId)) {
      cancelling = true;
      if (toast) {
        toast.title = `Cancelling: ${state.title}`;
        toast.message = undefined;
      }
      controller.abort();
    }
  }, CANCEL_POLL_MS);

  try {
    clearCancelRequest(); // stale/foreign cancel files must not kill this run
    bumpMutationEpoch(indexPaths, DEFAULT_ENV); // fence in-flight refreshers
    writeOperationState(state);
    toast = await showOperationToast(request.title);

    const cliOptions = (targetName?: string): WingetExecutorOptions => {
      // Called once per package (bulk runs re-invoke it), so each package's
      // retry chain starts unelevated; the guard re-arms only if the chain
      // falls back to an elevated relaunch.
      elevatedPhase = false;
      return {
        signal: controller.signal,
        onElevated: () => {
          elevatedPhase = true;
        },
        onSpawn: (pid) => {
          registerWingetPid(lockPath, opId, pid);
        },
        onProgress: (progress) => {
          const message = progressMessage(progress);
          publish({
            stage: progress.type,
            message:
              state.bulk && targetName
                ? `${targetName} (${state.bulk.index + 1}/${state.bulk.total})${message ? ` • ${message}` : ""}`
                : message,
          });
        },
      };
    };

    let result: WingetOperationResult;
    // Successfully upgraded/installed targets, re-checked against the
    // post-operation refresh: any that winget immediately re-offers get
    // hidden as not-applicable.
    const succeededTargets: PackageTarget[] = [];
    try {
      switch (request.kind) {
        case "upgrade-all":
        case "uninstall-all":
          result = await runBulkOperation(
            request,
            state,
            publish,
            cliOptions,
            indexPaths,
            lockPath,
            opId,
            () => fenced || cancelling,
            request.kind === "upgrade-all" ? succeededTargets : undefined,
          );
          break;
        case "import":
          result = await importPackages(request.inputPath ?? "", {
            ignoreUnavailable: request.ignoreUnavailable,
            ignoreVersions: request.ignoreVersions,
            noUpgrade: request.noUpgrade,
            ...cliOptions(),
          });
          break;
        case "export":
          result = await exportPackages(request.outputPath ?? "", request.includeVersions ?? false, cliOptions());
          break;
        default: {
          if (!request.target) {
            result = { success: false, message: "Missing package details" };
            break;
          }
          result = await runSingleCliOperation(
            request.kind,
            request.target,
            request.version,
            cliOptions(),
            request.force,
          );
          registerWingetPid(lockPath, opId, null); // child exited
          if (result.success && !result.noop && (request.kind === "upgrade" || request.kind === "install")) {
            succeededTargets.push(request.target);
          }
          if (!fenced && PATCHABLE_KINDS.has(request.kind)) {
            // Optimistic patch: open views update on their next tick.
            patchMutable(
              indexPaths,
              DEFAULT_ENV,
              {},
              (slices) => applyOperationPatch(request.kind, request.target, request.version, result, slices) ?? slices,
            );
          }
          break;
        }
      }
    } catch (error) {
      result = {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }

    if (fenced) {
      const interrupted: OperationState = {
        ...state,
        status: "interrupted",
        stage: "interrupted",
        errorMessage: "The operation was taken over after a stall",
        finishedAt: Date.now(),
        updatedAt: Date.now(),
      };
      appendOperationHistory(interrupted);
      if (toast) {
        await finalizeOperationToast(toast, interrupted);
      }
      return interrupted;
    }

    const status = statusFromResult(result);
    if (status === "noop") {
      // Noop titles are self-explanatory; a message only adds information
      // when the noop revealed a not-applicable update that is now hidden.
      result.message = undefined;
      if (request.kind === "upgrade" && request.target) {
        const hidden = markNotApplicableIfListed(indexPaths, request.target);
        if (hidden) {
          result.message = `Version ${hidden} does not apply to this system and is hidden until a newer version appears`;
        }
      }
    }
    publish(
      {
        status,
        stage: "finished",
        message: result.message,
        errorMessage: status === "failed" ? result.message : undefined,
        errorKind: status === "failed" && isModifiedPortableFailure(result) ? "portable-modified" : undefined,
        downloadPath: result.downloadPath,
        finishedAt: Date.now(),
      },
      { force: true },
    );
    appendOperationHistory(state);

    if (FAST_KINDS.has(request.kind)) {
      // Lane A: terminal feedback and lock release FIRST; the refresh
      // happens outside the lock, epoch-fenced.
      clearCancelRequest();
      releaseLock(lockPath, opId);
      releasedEarly = true;
      await finalizeOperationToast(toast, state);
      if (!NO_REFRESH_KINDS.has(request.kind)) {
        await bestEffortMutableRefresh(indexPaths);
      }
      return state;
    }

    // Long operations: authoritative refresh under the still-held lock — no
    // other mutation can interleave with this snapshot. Its failure must
    // never change the operation's reported outcome.
    if (!NO_REFRESH_KINDS.has(request.kind)) {
      if (toast) {
        toast.message = "Refreshing package data…";
      }
      try {
        // Incremental slice commits (views go fresh per-slice); ownership is
        // re-verified before EVERY commit — a sleep mid-refresh may have let
        // a reaper in, in which case a commit would straddle the new owner's
        // mutation.
        const refreshed = await refreshSlicesIncrementally(indexPaths, {
          stillOwned: () => heartbeatLock(lockPath, opId) !== "fenced",
        });
        if (refreshed.outcome === "fenced") {
          fenced = true;
        } else if (succeededTargets.length > 0) {
          // Some installers report a version winget cannot match against the
          // catalog (e.g. self-updating apps), so winget offers the same
          // upgrade again immediately after a successful one. Hide those rows
          // exactly like refused upgrades — the row would otherwise reappear
          // after every upgrade forever.
          for (const target of succeededTargets) {
            const hidden = markNotApplicableIfListed(indexPaths, target);
            // Single operations surface the hiding in the toast; bulk runs
            // keep their upgraded/skipped/failed summary.
            if (hidden && request.target) {
              state.message = `winget still lists version ${hidden}, so it is hidden until a newer version appears`;
            }
          }
        } else if (
          // Some uninstallers only launch their own confirmation GUI and
          // exit; winget reports success regardless. The spawned window opens
          // unfocused (a background process has no foreground rights), so
          // disclose it instead of relaying the lie.
          state.status === "succeeded" &&
          request.target &&
          request.kind === "uninstall" &&
          refreshed.installed.some(
            (i) =>
              i.id === request.target!.id &&
              i.source === request.target!.source &&
              (!request.version || i.version === request.version),
          )
        ) {
          state.message =
            "winget reported success, but the package is still installed. The uninstaller may have opened a window in the background";
        }
      } catch (error) {
        console.error("post-operation refresh failed", error);
      }
    }

    if (toast) {
      await finalizeOperationToast(toast, state);
    }
    return state;
  } finally {
    clearInterval(heartbeatTimer);
    clearInterval(cancelTimer);
    if (!fenced && !releasedEarly) {
      clearCancelRequest();
      releaseLock(lockPath, opId);
    }
  }
}

/** Post-release mutable refresh: abandoned if any mutation starts meanwhile. */
async function bestEffortMutableRefresh(indexPaths: IndexPaths): Promise<void> {
  try {
    const startEpoch = currentMutationEpoch(indexPaths);
    await refreshSlicesIncrementally(indexPaths, { startEpoch });
  } catch (error) {
    console.error("post-operation refresh failed", error);
  }
}

async function runBulkOperation(
  request: OperationRequest,
  state: OperationState,
  publish: (patch: Partial<OperationState>, options?: { force?: boolean }) => void,
  cliOptions: (targetName?: string) => WingetExecutorOptions,
  indexPaths: IndexPaths,
  lockPath: string,
  opId: string,
  shouldStop: () => boolean,
  succeededTargets?: PackageTarget[],
): Promise<WingetOperationResult> {
  const targets = request.targets ?? [];
  const perPackageKind: SingleOperationKind = request.kind === "uninstall-all" ? "uninstall" : "upgrade";
  let succeeded = 0;
  let skipped = 0;
  let failed = 0;
  const failedNames: string[] = [];
  const failedDetails: string[] = [];

  if (targets.length === 0) {
    return { success: true, noop: true };
  }

  const bulkCounts = () => ({
    total: targets.length,
    succeeded,
    skipped,
    failed,
    failedNames,
    failedDetails,
  });

  for (let index = 0; index < targets.length; index++) {
    if (shouldStop()) {
      break;
    }
    const target = targets[index]!;
    publish(
      {
        target,
        bulk: { index, ...bulkCounts(), currentPackageName: target.name },
        message: `${target.name} (${index + 1}/${targets.length})`,
        stage: "starting",
      },
      { force: true },
    );

    const result = await runSingleCliOperation(perPackageKind, target, target.version, cliOptions(target.name));
    registerWingetPid(lockPath, opId, null); // child exited
    if (result.cancelled) {
      break;
    }
    if (result.success && result.noop) {
      // Nothing changed — e.g. "no applicable update" for a version winget
      // cannot determine. Counting these as successes would make "N succeeded"
      // include packages that remain in the upgradable list.
      skipped++;
      if (perPackageKind === "upgrade" && !shouldStop()) {
        // Bulk targets come from the upgradable list, so a skip means the
        // listed version is not applicable — hide it from future runs.
        markNotApplicableIfListed(indexPaths, target);
      }
    } else if (result.success) {
      succeeded++;
      succeededTargets?.push(target);
      // Per-package optimistic patch: a mid-bulk interruption preserves the
      // rows that were already truthfully mutated.
      if (!shouldStop()) {
        patchMutable(
          indexPaths,
          DEFAULT_ENV,
          {},
          (slices) => applyOperationPatch(perPackageKind, target, target.version, result, slices) ?? slices,
        );
      }
    } else {
      failed++;
      failedNames.push(target.name);
      failedDetails.push(`${target.name}: ${result.message ?? "Unknown error"}`);
    }
    publish({
      bulk: {
        index: index + 1,
        ...bulkCounts(),
        currentPackageName: target.name,
      },
    });
  }

  publish(
    {
      bulk: { index: targets.length, ...bulkCounts() },
      target: undefined,
    },
    { force: true },
  );

  if (shouldStop()) {
    return {
      success: false,
      cancelled: true,
      message: "Operation was cancelled",
    };
  }
  if (failed > 0) {
    // The terminal toast title carries the counts; the message must add
    // information: WHICH packages failed.
    const failedList = failedNames.slice(0, 5).join(", ") + (failedNames.length > 5 ? ", …" : "");
    return { success: false, message: `Failed: ${failedList}` };
  }
  return { success: true, noop: succeeded === 0 };
}

/**
 * Direct "Upgrade All Packages" launch (no request context): preflight a
 * mutable-slice refresh so targets are real, current data — never a stale
 * cache (which silently omits new releases), never a full index build. The
 * preflight runs WITHOUT the op-lock (queries only; the epoch fence rejects
 * its commit if a mutation interleaves), so a user idling on the confirmation
 * dialog cannot hold the global lock; the engine acquires it normally after.
 */
async function runDirectUpgradeAll(): Promise<void> {
  const indexPaths = getIndexPaths();

  // Advisory gate first: instant feedback instead of a doomed preflight.
  const gate = inspectOperationGate();
  if (gate.status === "busy") {
    await showBusyToast(gate.title);
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Checking for updates…",
  });

  let targets: PackageTarget[];
  try {
    const startEpoch = currentMutationEpoch(indexPaths);
    // Batch fetch, not incremental commits: the target list must come from
    // ONE consistent snapshot (upgradable joined against pinned).
    const data = await fetchMutableData();
    const outcome = patchMutable(indexPaths, DEFAULT_ENV, { startEpoch, stampMutableAt: true }, () => ({
      installed: data.installed,
      upgradable: data.upgradable,
      pinned: data.pinned,
    }));
    if (outcome === "fenced") {
      // A mutation started mid-preflight; discard the stale snapshot.
      const now = inspectOperationGate();
      toast.style = Toast.Style.Failure;
      toast.title = `${now.status === "busy" ? now.title : "A WinGet operation"} is in progress`;
      toast.message = "Try again when it finishes";
      await toast.show();
      return;
    }

    // Markers were reconciled against this snapshot by the commit above.
    const notApplicable = loadIndex(indexPaths)?.notApplicable ?? {};
    const pinnedKeys = new Set(data.pinned.map((p) => packageKey(p)));
    targets = data.upgradable
      .filter((u) => !pinnedKeys.has(packageKey(u)) && notApplicable[packageKey(u)] !== u.available)
      .map((u) => ({ id: u.id, name: u.name, source: u.source }));
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not check for updates";
    toast.message = error instanceof Error ? error.message : undefined;
    await toast.show();
    return;
  }

  if (targets.length === 0) {
    toast.style = Toast.Style.Success;
    toast.title = "All packages are up to date";
    toast.message = undefined;
    await toast.show();
    return;
  }

  // Bulk mutations require confirmation; tolerate environments where the
  // Alert API is unavailable by proceeding.
  let confirmed = true;
  try {
    const names = targets
      .slice(0, 8)
      .map((t) => t.name)
      .join(", ");
    confirmed = await confirmAlert({
      title: `Upgrade ${targets.length} ${targets.length === 1 ? "package" : "packages"}?`,
      message: names + (targets.length > 8 ? ", …" : ""),
    });
  } catch {
    confirmed = true;
  }
  if (!confirmed) {
    await toast.hide();
    return;
  }

  await runOperation({
    requestId: randomUUID(),
    kind: "upgrade-all",
    title: operationTitle("upgrade-all"),
    targets,
  });
}

/**
 * Lane B entry with follow-ups. When a single uninstall fails because winget
 * refused to remove a modified portable package, offer a forced retry via
 * confirmAlert: the first operation has already finalized and released the
 * lock (nothing is held while waiting on the user), the runner worker stays
 * alive while its promise is pending, and the window is at root right after
 * the launch pop. A confirmed retry runs as a fresh operation through the
 * normal gate. Bulk operations report the failure plainly — no per-package
 * prompts mid-run.
 */
async function runOperationWithFollowUp(request: OperationRequest): Promise<OperationState | null> {
  const state = await runOperation(request);
  if (
    request.kind !== "uninstall" ||
    request.force ||
    state?.status !== "failed" ||
    state.errorKind !== "portable-modified"
  ) {
    return state;
  }

  const name = request.target?.name ?? request.target?.id ?? "package";
  let confirmed = false;
  try {
    confirmed = await confirmAlert({
      title: `Force uninstall ${name}?`,
      message:
        "winget could not remove this portable package because it was modified after installation. Forcing deletes those changes.",
      primaryAction: {
        title: "Force Uninstall",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: { title: "Cancel" },
    });
  } catch {
    // Alert API unavailable: leave the failure standing rather than force.
    return state;
  }
  if (!confirmed) {
    return state;
  }
  // The confirmed retry supersedes the first failure's notification.
  acknowledgeFailure(state);
  return runOperation(createOperationRequest({ ...request, force: true }));
}

export { getIndexPaths, runDirectUpgradeAll, runOperation, runOperationWithFollowUp };
