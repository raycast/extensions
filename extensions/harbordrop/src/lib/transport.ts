import type { Application } from "@raycast/api";
import { assertOfficialApp } from "./app-signature";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  Action,
  Descriptor,
  DownloadTask,
  IntegrationRequest,
  Receipt,
  Snapshot,
  TASK_STATES,
  parseDescriptor,
  parseReceipt,
  parseSnapshot,
  requireReady,
  requireAccess,
  uuid,
  validateURL,
} from "./contract";
import { IntegrationError } from "./errors";
import {
  MAX_METADATA_BYTES,
  MAX_SNAPSHOT_BYTES,
  publishRequest,
  readJSON,
} from "./files";

export const INTEGRATION_ROOT = join(
  homedir(),
  "Library",
  "Application Support",
  "HarborDrop",
  "RaycastIntegration",
  "v1",
);
export const CLIENT_VERSION = "1.0.0";
export interface SharedState {
  descriptor: Descriptor;
  snapshot: Snapshot;
}
export interface PendingRequest {
  requestID: string;
  namespaceEpoch: string;
  producerInstanceID: string;
  action: Action;
  createdAt: number;
  payloadHash?: string;
  receiptRevision?: number;
}
export interface PollResult {
  receipt?: Receipt;
  timedOut: boolean;
}

export async function loadSharedState(
  root = INTEGRATION_ROOT,
): Promise<SharedState> {
  const descriptor = parseDescriptor(
    await readJSON(root, "descriptor.json", MAX_METADATA_BYTES),
  );
  if (!descriptor.enabled) throw new IntegrationError("integrationDisabled");
  const snapshot = parseSnapshot(
    await readJSON(root, "state.json", MAX_SNAPSHOT_BYTES),
  );
  const current = parseDescriptor(
    await readJSON(root, "descriptor.json", MAX_METADATA_BYTES),
  );
  if (!current.enabled) throw new IntegrationError("integrationDisabled");
  if (
    current.namespaceEpoch !== descriptor.namespaceEpoch ||
    current.producerInstanceID !== descriptor.producerInstanceID ||
    snapshot.namespaceEpoch !== descriptor.namespaceEpoch ||
    snapshot.producerInstanceID !== descriptor.producerInstanceID
  )
    throw new IntegrationError("stale");
  requireAccess(current, snapshot);
  return { descriptor: current, snapshot };
}

export function makeRequest(
  state: SharedState,
  action: Action,
  options: {
    url?: string;
    task?: DownloadTask;
    now?: number;
    requestID?: string;
  } = {},
): IntegrationRequest {
  const now = options.now ?? Date.now() / 1000;
  requireReady(state.descriptor, state.snapshot, now);
  if (!state.snapshot.capabilities.includes(action))
    throw new IntegrationError("unsupportedAction");
  const request: IntegrationRequest = {
    schemaVersion: 1,
    requestID: uuid(options.requestID ?? randomUUID()),
    clientVersion: CLIENT_VERSION,
    namespaceEpoch: state.descriptor.namespaceEpoch,
    producerInstanceID: state.descriptor.producerInstanceID,
    createdAt: now,
    expiresAt: now + 120,
    action,
  };
  if (action === "reviewAddURL") request.url = validateURL(options.url ?? "");
  if (action === "showTask" || action === "revealTask") {
    const task =
      options.task &&
      state.snapshot.tasks.find((t) => t.taskID === options.task?.taskID);
    if (
      !task ||
      task.taskRevision !== options.task?.taskRevision ||
      !TASK_STATES.includes(task.state as (typeof TASK_STATES)[number]) ||
      !task.availableActions.includes(action)
    )
      throw new IntegrationError("unsupportedAction");
    request.taskID = task.taskID;
    request.expectedTaskRevision = task.taskRevision;
    request.observedSnapshotRevision = state.snapshot.snapshotRevision;
  }
  return request;
}

export function pendingReference(request: IntegrationRequest): PendingRequest {
  return {
    requestID: request.requestID,
    namespaceEpoch: request.namespaceEpoch,
    producerInstanceID: request.producerInstanceID,
    action: request.action,
    createdAt: request.createdAt,
  };
}

export interface SubmissionOptions {
  root?: string;
  signal?: AbortSignal;
  verifyApp?: typeof assertOfficialApp;
}

export async function submitRequest(
  request: IntegrationRequest,
  app: Application,
  options: SubmissionOptions = {},
): Promise<void> {
  const root = options.root ?? INTEGRATION_ROOT;
  if (options.signal?.aborted) throw new IntegrationError("cancelled");
  await (options.verifyApp ?? assertOfficialApp)(app, options.signal);
  if (options.signal?.aborted) throw new IntegrationError("cancelled");
  const current = await loadSharedState(root);
  requireReady(current.descriptor, current.snapshot);
  if (
    current.descriptor.namespaceEpoch !== request.namespaceEpoch ||
    current.descriptor.producerInstanceID !== request.producerInstanceID
  )
    throw new IntegrationError("stale");
  const validateGeneration = async () => {
    if (options.signal?.aborted) throw new IntegrationError("cancelled");
    const latest = await loadSharedState(root);
    requireReady(latest.descriptor, latest.snapshot);
    if (
      latest.descriptor.namespaceEpoch !== request.namespaceEpoch ||
      latest.descriptor.producerInstanceID !== request.producerInstanceID ||
      request.expiresAt <= Date.now() / 1000
    )
      throw new IntegrationError("stale");
  };
  await publishRequest(
    root,
    request.requestID,
    JSON.stringify(request),
    validateGeneration,
  );
}

export function wakeURL(requestID: string): string {
  return `harbordrop://integration?v=1&request=${uuid(requestID)}`;
}
export function terminal(receipt: Receipt): boolean {
  return !["accepted", "awaitingUser", "executing"].includes(receipt.status);
}

export async function readReceipt(
  pending: PendingRequest,
  root = INTEGRATION_ROOT,
): Promise<Receipt | undefined> {
  let value: unknown;
  try {
    value = await readJSON(
      root,
      `receipts/${uuid(pending.requestID)}.json`,
      MAX_METADATA_BYTES,
    );
  } catch (error) {
    if (error instanceof IntegrationError && error.code === "missing")
      return undefined;
    throw error;
  }
  const receipt = parseReceipt(value);
  if (
    receipt.requestID !== pending.requestID ||
    receipt.namespaceEpoch !== pending.namespaceEpoch ||
    (pending.payloadHash && pending.payloadHash !== receipt.payloadHash) ||
    (pending.receiptRevision !== undefined &&
      receipt.receiptRevision < pending.receiptRevision)
  )
    throw new IntegrationError("requestConflict");
  // Hashes are opaque app values, not a same-user authentication mechanism.
  return receipt;
}

export async function pollReceipt(
  pending: PendingRequest,
  options: {
    root?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
    onReceipt?: (receipt: Receipt) => void;
  } = {},
): Promise<PollResult> {
  const started = performance.now();
  const timeout = options.timeoutMs ?? 10000;
  let latest: Receipt | undefined;
  let attempt = 0;
  const reference = { ...pending };
  do {
    if (options.signal?.aborted) throw new IntegrationError("cancelled");
    latest = await readReceipt(reference, options.root);
    if (options.signal?.aborted) throw new IntegrationError("cancelled");
    if (latest) {
      reference.payloadHash = latest.payloadHash;
      reference.receiptRevision = latest.receiptRevision;
      options.onReceipt?.(latest);
      if (options.signal?.aborted) throw new IntegrationError("cancelled");
      if (terminal(latest)) return { receipt: latest, timedOut: false };
    }
    const remaining = timeout - (performance.now() - started);
    if (remaining <= 0) break;
    try {
      await delay(
        Math.min(remaining, [500, 1000, 2000][Math.min(attempt++, 2)]),
        undefined,
        { signal: options.signal },
      );
    } catch {
      throw new IntegrationError("cancelled");
    }
  } while (performance.now() - started < timeout);
  return { receipt: latest, timedOut: true };
}
