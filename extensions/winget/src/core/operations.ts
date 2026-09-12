/**
 * Operation requests, records, and the cross-command operation API.
 *
 * Lane B (long ops) flow: a view materializes an OperationRequest, writes it to
 * op-request.json, and launches the runner command with {requestId} as context
 * (no large payloads through IPC). The runner takes the request (read+delete),
 * acquires the global lock, and maintains op-state.json — the single live
 * record views poll while a lock exists. Terminal records go to
 * op-history.json (last 20).
 *
 * Cancellation: views write op-cancel.json keyed to the LOCK's opId; the
 * runner polls it and flips its own toast — views never own cancel feedback.
 */

import { randomUUID } from "node:crypto";

import { type WingetSource } from "../cli/types";

import { deleteFileQuiet, readJson, writeJsonAtomic } from "./files";
import { inspectLock, type LockInspection } from "./lock";
import { requestPath, supportPath } from "./paths";

type OperationKind =
  | "install"
  | "install-version"
  | "upgrade"
  | "uninstall"
  | "repair"
  | "download"
  | "pin"
  | "unpin"
  | "upgrade-all"
  | "uninstall-all"
  | "import"
  | "export";

interface PackageTarget {
  id: string;
  name: string;
  source: WingetSource;
  /** Set when multiple versions are installed: uninstalls must disambiguate. */
  version?: string;
}

interface OperationRequest {
  requestId: string;
  kind: OperationKind;
  title: string;
  /** Single-package operations. */
  target?: PackageTarget;
  /** install-version. */
  version?: string;
  /** Bulk operations (upgrade-all / uninstall-all); resolved by the requester. */
  targets?: PackageTarget[];
  /** import options. */
  inputPath?: string;
  ignoreUnavailable?: boolean;
  ignoreVersions?: boolean;
  noUpgrade?: boolean;
  /** export options. */
  outputPath?: string;
  includeVersions?: boolean;
  /**
   * uninstall: override winget's modified-portable-package check with
   * --force. Set only by the follow-up flow after explicit user confirmation.
   */
  force?: boolean;
}

type OperationStatus = "running" | "succeeded" | "noop" | "failed" | "cancelled" | "interrupted";

interface BulkProgress {
  index: number;
  total: number;
  /** Packages that actually changed. */
  succeeded: number;
  /** No-ops: winget reported nothing to do (e.g. "no applicable update"). */
  skipped: number;
  failed: number;
  /** Names of failed packages, listed in the terminal toast (capped). */
  failedNames: string[];
  /** "Name: reason" per failed package — history and Copy Error Details. */
  failedDetails: string[];
  currentPackageName?: string;
}

interface OperationState {
  opId: string;
  requestId: string;
  kind: OperationKind;
  title: string;
  target?: PackageTarget;
  stage: string;
  message?: string;
  bulk?: BulkProgress;
  status: OperationStatus;
  startedAt: number;
  updatedAt: number;
  finishedAt?: number;
  errorMessage?: string;
  /** Failure classification for follow-up flows (force-uninstall prompt). */
  errorKind?: "portable-modified";
  /** Path of a downloaded installer (download operations). */
  downloadPath?: string;
}

const MAX_HISTORY = 20;

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

function createOperationRequest(definition: Omit<OperationRequest, "requestId">): OperationRequest {
  return { ...definition, requestId: randomUUID() };
}

function writeOperationRequest(request: OperationRequest): void {
  writeJsonAtomic(requestPath(request.requestId), request);
}

/** Discard a request that will never be consumed (its launch failed). */
function discardOperationRequest(requestId: string): void {
  deleteFileQuiet(requestPath(requestId));
}

/** Read-and-consume the pending request; null when missing or id mismatch. */
function takeOperationRequest(requestId: string): OperationRequest | null {
  // Defensive: request ids come from launch context; never let them traverse paths.
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
    return null;
  }
  const path = requestPath(requestId);
  const request = readJson<OperationRequest>(path);
  if (!request || request.requestId !== requestId) {
    return null;
  }
  deleteFileQuiet(path);
  return request;
}

// ---------------------------------------------------------------------------
// Live state and history (writers must hold the op-lock)
// ---------------------------------------------------------------------------

function writeOperationState(state: OperationState): void {
  writeJsonAtomic(supportPath("opState"), { ...state, updatedAt: Date.now() });
}

function readOperationState(): OperationState | null {
  return readJson<OperationState>(supportPath("opState"));
}

function readOperationHistory(): OperationState[] {
  return readJson<OperationState[]>(supportPath("opHistory")) ?? [];
}

function appendOperationHistory(record: OperationState): void {
  const next = [record, ...readOperationHistory().filter((item) => item.opId !== record.opId)];
  writeJsonAtomic(supportPath("opHistory"), next.slice(0, MAX_HISTORY));
}

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

interface CancelRequest {
  opId: string;
}

function requestCancel(opId: string): void {
  writeJsonAtomic(supportPath("opCancel"), { opId } satisfies CancelRequest);
}

function isCancelRequested(opId: string): boolean {
  return readJson<CancelRequest>(supportPath("opCancel"))?.opId === opId;
}

/** The lock owner clears any cancel file at acquisition (stale/foreign) and on exit (own). */
function clearCancelRequest(): void {
  deleteFileQuiet(supportPath("opCancel"));
}

// ---------------------------------------------------------------------------
// The gate — what views and action handlers see
// ---------------------------------------------------------------------------

type OperationGate =
  | { status: "free" }
  | {
      status: "busy";
      title: string;
      /** The LOCK's opId — the authoritative cancellation key. */
      lockOpId: string | null;
      opState: OperationState | null;
    }
  | { status: "interrupted"; opState: OperationState | null };

/**
 * Advisory view of the global lock. A stale lock is reported as "interrupted"
 * — views must treat it as NOT active (mutations may proceed; the runner
 * performs the authoritative reap), so a dead runner can never lock
 * mutations out permanently.
 */
function inspectOperationGate(): OperationGate {
  const inspection: LockInspection = inspectLock(supportPath("opLock"));
  if (inspection.state === "free") {
    return { status: "free" };
  }
  const opState = readOperationState();
  if (inspection.state === "stale") {
    return { status: "interrupted", opState };
  }
  return {
    status: "busy",
    title: inspection.record?.title ?? opState?.title ?? "WinGet operation",
    lockOpId: inspection.record?.opId ?? null,
    opState: opState && opState.opId === inspection.record?.opId ? opState : null,
  };
}

// ---------------------------------------------------------------------------
// Unobserved-failure surfacing
// ---------------------------------------------------------------------------

interface FailureAck {
  acknowledgedFinishedAt: number;
}

/** Newest unacknowledged failed/interrupted record, if any. */
function readUnacknowledgedFailure(): OperationState | null {
  const newest = readOperationHistory()[0];
  if (!newest || (newest.status !== "failed" && newest.status !== "interrupted") || !newest.finishedAt) {
    return null;
  }
  const ack = readJson<FailureAck>(supportPath("failureAck"));
  if (ack && ack.acknowledgedFinishedAt >= newest.finishedAt) {
    return null;
  }
  return newest;
}

function acknowledgeFailure(record: OperationState): void {
  writeJsonAtomic(supportPath("failureAck"), {
    acknowledgedFinishedAt: record.finishedAt ?? Date.now(),
  } satisfies FailureAck);
}

export {
  acknowledgeFailure,
  appendOperationHistory,
  clearCancelRequest,
  createOperationRequest,
  discardOperationRequest,
  inspectOperationGate,
  isCancelRequested,
  readOperationHistory,
  readOperationState,
  readUnacknowledgedFailure,
  requestCancel,
  takeOperationRequest,
  writeOperationRequest,
  writeOperationState,
  type BulkProgress,
  type OperationGate,
  type OperationKind,
  type OperationRequest,
  type OperationState,
  type OperationStatus,
  type PackageTarget,
};
