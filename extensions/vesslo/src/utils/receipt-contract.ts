import {
  HandoffRequest,
  HandoffTarget,
  isHandoffISODate,
  isHandoffUUID,
  parseHandoffRequest,
  parseHandoffTarget,
} from "./handoff-contract";

export const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;
export const MAX_RECEIPTS = 128;
export const RECEIPT_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const RECEIPT_PHASES = [
  "accepted",
  "rejected",
  "running",
  "verificationPending",
  "completed",
  "failed",
  "cancelled",
] as const;
export type ReceiptPhase = (typeof RECEIPT_PHASES)[number];
export interface HandoffTargetReceipt {
  target: HandoffTarget;
  phase: ReceiptPhase;
  reason?: string;
  verificationRecordId?: string;
}
export interface HandoffReceipt {
  schemaVersion: 1 | 2;
  request: HandoffRequest;
  phase: ReceiptPhase;
  reason?: string;
  targets: HandoffTargetReceipt[];
  receivedAt: string;
  updatedAt: string;
  expiresAt: string;
  revision: number;
}
export class MalformedReceiptError extends Error {}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function phase(value: unknown): value is ReceiptPhase {
  return (
    typeof value === "string" &&
    (RECEIPT_PHASES as readonly string[]).includes(value)
  );
}
function reason(value: unknown): value is string | null | undefined {
  return (
    value == null ||
    (typeof value === "string" && Buffer.byteLength(value, "utf8") <= 4096)
  );
}
export function isTerminalReceipt(phase: ReceiptPhase): boolean {
  return ["completed", "failed", "cancelled", "rejected"].includes(phase);
}
export function aggregateReceiptPhase(
  targets: HandoffTargetReceipt[],
): ReceiptPhase {
  const phases = targets.map((target) => target.phase);
  if (phases.includes("verificationPending")) return "verificationPending";
  if (phases.includes("running")) return "running";
  if (phases.includes("accepted")) return "accepted";
  if (phases.length && phases.every((phase) => phase === "completed"))
    return "completed";
  if (phases.includes("failed") || phases.includes("completed"))
    return "failed";
  if (phases.includes("cancelled")) return "cancelled";
  return "rejected";
}
function canonicalTarget(target: HandoffTarget) {
  return {
    appId: target.appId.toLowerCase(),
    bundleId: target.bundleId,
    canonicalPath: target.canonicalPath,
    caskToken: target.caskToken,
    installedVersion: target.installedVersion,
    expectedTargetVersion: target.expectedTargetVersion,
    ...(target.readinessEvidenceId !== undefined
      ? { readinessEvidenceId: target.readinessEvidenceId.toLowerCase() }
      : {}),
  };
}
/** Swift re-encodes UUID case and ISO dates; identity strings and order stay exact. */
export function requestFingerprint(request: HandoffRequest): string {
  return JSON.stringify({
    schemaVersion: request.schemaVersion,
    requestId: request.requestId.toLowerCase(),
    publisherSessionId: request.publisherSessionId.toLowerCase(),
    createdAt: Date.parse(request.createdAt),
    inventoryRevision: request.inventoryRevision,
    completedCheckRevision: request.completedCheckRevision,
    source: request.source,
    targets: request.targets.map(canonicalTarget),
  });
}
function targetFingerprint(target: HandoffTarget): string {
  return JSON.stringify(canonicalTarget(target));
}
function canonicalTargetReceipt(target: HandoffTargetReceipt) {
  return {
    target: canonicalTarget(target.target),
    phase: target.phase,
    reason: target.reason,
    verificationRecordId: target.verificationRecordId?.toLowerCase(),
  };
}
export function receiptFingerprint(receipt: HandoffReceipt): string {
  return JSON.stringify({
    schemaVersion: receipt.schemaVersion,
    request: requestFingerprint(receipt.request),
    phase: receipt.phase,
    reason: receipt.reason,
    targets: receipt.targets.map(canonicalTargetReceipt),
    receivedAt: Date.parse(receipt.receivedAt),
    updatedAt: Date.parse(receipt.updatedAt),
    expiresAt: Date.parse(receipt.expiresAt),
    revision: receipt.revision,
  });
}
export function parseReceiptEnvelope(
  content: string,
  now = Date.now(),
): HandoffReceipt[] {
  if (Buffer.byteLength(content, "utf8") > MAX_RECEIPT_BYTES)
    throw new MalformedReceiptError("Receipt file exceeds 4 MiB.");
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw new MalformedReceiptError("Receipt file contains malformed JSON.");
  }
  if (
    !object(value) ||
    (value.schemaVersion !== 1 && value.schemaVersion !== 2) ||
    !Array.isArray(value.receipts) ||
    value.receipts.length > MAX_RECEIPTS
  ) {
    throw new MalformedReceiptError(
      "Unsupported or malformed receipt envelope.",
    );
  }
  const ids = new Set<string>();
  return value.receipts.map((raw): HandoffReceipt => {
    if (!object(raw)) throw new MalformedReceiptError("Malformed receipt.");
    const request = parseHandoffRequest(raw.request);
    if (
      !request ||
      raw.schemaVersion !== request.schemaVersion ||
      (value.schemaVersion === 1 && request.schemaVersion !== 1) ||
      (request.schemaVersion === 2 &&
        new Set(
          request.targets.map((target) =>
            target.readinessEvidenceId?.toLowerCase(),
          ),
        ).size !== request.targets.length) ||
      !phase(raw.phase) ||
      !reason(raw.reason) ||
      !Number.isSafeInteger(raw.revision) ||
      (raw.revision as number) <= 0 ||
      !isHandoffISODate(raw.receivedAt) ||
      !isHandoffISODate(raw.updatedAt) ||
      !isHandoffISODate(raw.expiresAt) ||
      !Array.isArray(raw.targets) ||
      raw.targets.length !== request.targets.length
    ) {
      throw new MalformedReceiptError(
        "Receipt request, phase, revision or dates are invalid.",
      );
    }
    const received = Date.parse(raw.receivedAt),
      updated = Date.parse(raw.updatedAt),
      expires = Date.parse(raw.expiresAt);
    if (
      updated < received ||
      expires <= received ||
      expires - received > RECEIPT_LIFETIME_MS + 1 ||
      updated > now + 30000
    ) {
      throw new MalformedReceiptError(
        "Receipt date ordering or lifetime is invalid.",
      );
    }
    const id = request.requestId.toLowerCase();
    if (ids.has(id))
      throw new MalformedReceiptError("Duplicate receipt request ID.");
    ids.add(id);
    const targets = raw.targets.map((entry, index): HandoffTargetReceipt => {
      if (!object(entry))
        throw new MalformedReceiptError("Malformed target receipt.");
      const target = parseHandoffTarget(entry.target);
      if (
        !target ||
        targetFingerprint(target) !==
          targetFingerprint(request.targets[index]) ||
        !phase(entry.phase) ||
        !reason(entry.reason) ||
        (entry.verificationRecordId != null &&
          !isHandoffUUID(entry.verificationRecordId))
      ) {
        throw new MalformedReceiptError(
          "Target receipt does not match the original ordered identity.",
        );
      }
      return {
        target,
        phase: entry.phase,
        ...(entry.reason != null ? { reason: entry.reason } : {}),
        ...(typeof entry.verificationRecordId === "string"
          ? { verificationRecordId: entry.verificationRecordId }
          : {}),
      };
    });
    if (aggregateReceiptPhase(targets) !== raw.phase)
      throw new MalformedReceiptError(
        "Receipt aggregate does not match its target results.",
      );
    return {
      schemaVersion: request.schemaVersion,
      request,
      phase: raw.phase,
      ...(raw.reason != null ? { reason: raw.reason } : {}),
      targets,
      receivedAt: raw.receivedAt,
      updatedAt: raw.updatedAt,
      expiresAt: raw.expiresAt,
      revision: raw.revision as number,
    };
  });
}
export function isExpiredReceipt(
  receipt: HandoffReceipt,
  now: number,
): boolean {
  return (
    isTerminalReceipt(receipt.phase) &&
    Math.min(
      Date.parse(receipt.expiresAt),
      Date.parse(receipt.updatedAt) + RECEIPT_LIFETIME_MS,
    ) <= now
  );
}
/** Evidence observed during this reader's lifetime cannot be overwritten by a rollback. */
export function receiptTransitionReason(
  previous: HandoffReceipt,
  next: HandoffReceipt,
): string | null {
  if (
    previous.schemaVersion !== next.schemaVersion ||
    requestFingerprint(previous.request) !== requestFingerprint(next.request) ||
    Date.parse(previous.receivedAt) !== Date.parse(next.receivedAt) ||
    Date.parse(previous.expiresAt) !== Date.parse(next.expiresAt)
  )
    return "Receipt ID was reused with a different original request.";
  if (next.revision < previous.revision)
    return "Receipt revision moved backwards.";
  const identical = receiptFingerprint(previous) === receiptFingerprint(next);
  if (next.revision === previous.revision)
    return identical
      ? null
      : "Receipt changed without increasing its revision.";
  if (isTerminalReceipt(previous.phase))
    return "A terminal receipt was changed.";
  if (Date.parse(next.updatedAt) < Date.parse(previous.updatedAt))
    return "Receipt update time moved backwards.";
  if (
    previous.targets.some(
      (target, index) =>
        isTerminalReceipt(target.phase) &&
        JSON.stringify(canonicalTargetReceipt(target)) !==
          JSON.stringify(canonicalTargetReceipt(next.targets[index])),
    )
  )
    return "A terminal target result was changed.";
  return null;
}

export type ReceiptReadStatus =
  | "loading"
  | "ready"
  | "missing"
  | "permissionDenied"
  | "malformed"
  | "unsafeFile"
  | "ioError"
  | "conflict";
export interface ReceiptReadState {
  status: ReceiptReadStatus;
  receipts: HandoffReceipt[];
  expiredReceipts: HandoffReceipt[];
  reason: string | null;
  checkedAt: number | null;
}
export function initialReceiptState(): ReceiptReadState {
  return {
    status: "loading",
    receipts: [],
    expiredReceipts: [],
    reason: null,
    checkedAt: null,
  };
}

export type BoundReceiptStatus =
  | "awaitingReceipt"
  | "current"
  | "expired"
  | "unavailable"
  | "conflict";
export function bindReceipt(
  state: ReceiptReadState,
  request: HandoffRequest,
): {
  status: BoundReceiptStatus;
  receipt: HandoffReceipt | null;
  reason: string | null;
} {
  if (state.status === "missing")
    return {
      status: "awaitingReceipt",
      receipt: null,
      reason:
        "Awaiting a receipt for this exact request. No receipt file is available; acceptance and completion are unconfirmed. No request is resent.",
    };
  if (state.status !== "ready")
    return {
      status: "unavailable",
      receipt: null,
      reason:
        state.reason ??
        "Waiting for a readable receipt file. Acceptance is not confirmed.",
    };
  const receipt = [...state.receipts, ...state.expiredReceipts].find(
    (entry) =>
      entry.request.requestId.toLowerCase() === request.requestId.toLowerCase(),
  );
  if (!receipt)
    return {
      status: "awaitingReceipt",
      receipt: null,
      reason:
        "Awaiting a receipt for this exact request. URL opening is not acceptance; no request is resent.",
    };
  if (requestFingerprint(receipt.request) !== requestFingerprint(request))
    return {
      status: "conflict",
      receipt: null,
      reason:
        "Receipt ID matches but the original request differs. Result cannot be used.",
    };
  if (state.expiredReceipts.includes(receipt))
    return {
      status: "expired",
      receipt,
      reason:
        "This terminal receipt has expired and is historical, not current confirmation.",
    };
  return { status: "current", receipt, reason: null };
}
