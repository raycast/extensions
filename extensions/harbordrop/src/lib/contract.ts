import { IntegrationError, mustClearSharedState } from "./errors";

export const SCHEMA_VERSION = 1;
export const ACCESS_POLICY_VERSION = 1;
export const ACCESS_STATES = [
  "licensed",
  "trial",
  "checking",
  "licenseRequired",
  "verificationRequired",
  "integrityBlocked",
] as const;
export interface AccessDecision {
  state: (typeof ACCESS_STATES)[number];
  validUntil?: number;
}
export const STALE_AFTER_SECONDS = 30;
export const MAX_URL_BYTES = 8192;
export const ACTIONS = [
  "refreshState",
  "reviewAddURL",
  "showTask",
  "revealTask",
] as const;
export type Action = (typeof ACTIONS)[number];
export const TASK_STATES = [
  "pending",
  "downloading",
  "paused",
  "merging",
  "completed",
  "error",
  "cancelled",
] as const;
export const RECEIPT_STATUSES = [
  "accepted",
  "awaitingUser",
  "executing",
  "succeeded",
  "rejected",
  "expired",
  "cancelled",
  "failed",
  "reconciliationRequired",
] as const;
export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

export interface Descriptor {
  accessPolicyVersion?: number;
  schemaVersion: number;
  minimumReaderVersion: number;
  enabled: boolean;
  producerInstanceID: string;
  namespaceEpoch: string;
  appVersion: string;
  appBuild: string;
}
export interface DownloadTask {
  taskID: string;
  taskRevision: number;
  displayName: string;
  state: string;
  engineKind: string;
  completedBytes: number;
  totalBytes?: number;
  progress?: number;
  speed?: number;
  waitingReason?: string;
  failureCode?: string;
  availableActions: Action[];
  outputAvailability: string;
}
export interface Snapshot extends Omit<Descriptor, "enabled"> {
  access?: AccessDecision;
  snapshotRevision: number;
  generatedAt: number;
  lifecycle: "starting" | "ready" | "terminating";
  dataHealth: "loading" | "ready" | "reconciling" | "unreadable";
  capabilities: Action[];
  truncated: boolean;
  totalTaskCount: number;
  tasks: DownloadTask[];
}
export interface IntegrationRequest {
  schemaVersion: number;
  requestID: string;
  clientVersion: string;
  namespaceEpoch: string;
  producerInstanceID: string;
  createdAt: number;
  expiresAt: number;
  observedSnapshotRevision?: number;
  taskID?: string;
  expectedTaskRevision?: number;
  action: Action;
  url?: string;
}
export interface Receipt {
  schemaVersion: number;
  requestID: string;
  payloadHash: string;
  producerInstanceID: string;
  namespaceEpoch: string;
  receiptRevision: number;
  status: ReceiptStatus;
  reasonCode?: string;
  updatedAt: number;
  resultingTaskID?: string;
  plannedTaskID?: string;
  failureRecordedTaskID?: string;
}

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new IntegrationError("malformed");
  return value as Record<string, unknown>;
}
function hasControl(value: string): boolean {
  return [...value].some(
    (character) =>
      character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
  );
}
export function string(value: unknown, maximum = 1024): string {
  if (typeof value !== "string" || value.length > maximum || hasControl(value))
    throw new IntegrationError("malformed");
  return value;
}
export function uuid(value: unknown): string {
  const result = string(value, 36);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      result,
    )
  )
    throw new IntegrationError("malformed");
  return result.toLowerCase();
}
function number(value: unknown, integer = false): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    (integer && !Number.isSafeInteger(value))
  )
    throw new IntegrationError("malformed");
  return value;
}
function bool(value: unknown): boolean {
  if (typeof value !== "boolean") throw new IntegrationError("malformed");
  return value;
}
function optional<T>(
  value: unknown,
  parse: (value: unknown) => T,
): T | undefined {
  return value == null ? undefined : parse(value);
}
function enumeration<T extends string>(
  value: unknown,
  values: readonly T[],
): T {
  if (!values.includes(value as T)) throw new IntegrationError("malformed");
  return value as T;
}
function actions(value: unknown): Action[] {
  if (!Array.isArray(value) || value.length > 32)
    throw new IntegrationError("malformed");
  return value
    .map((v) => string(v, 64))
    .filter((v): v is Action => ACTIONS.includes(v as Action));
}
function version(value: Record<string, unknown>): void {
  if (
    value.schemaVersion !== 1 ||
    (value.minimumReaderVersion !== undefined &&
      number(value.minimumReaderVersion, true) > 1)
  )
    throw new IntegrationError("incompatibleSchema");
}
function requirePolicyVersion(value: number | undefined): void {
  if (value === undefined) throw new IntegrationError("upgradeRequired");
  if (value !== ACCESS_POLICY_VERSION)
    throw new IntegrationError("incompatibleSchema");
}

function parseAccess(value: unknown): AccessDecision {
  if (value === undefined) throw new IntegrationError("upgradeRequired");
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new IntegrationError("incompatibleSchema");
  const access = value as Record<string, unknown>;
  if (!ACCESS_STATES.includes(access.state as AccessDecision["state"]))
    throw new IntegrationError("incompatibleSchema");
  const state = access.state as AccessDecision["state"];
  if (state === "licensed" || state === "trial") {
    if (
      typeof access.validUntil !== "number" ||
      !Number.isFinite(access.validUntil) ||
      access.validUntil <= 0
    )
      throw new IntegrationError("incompatibleSchema");
    return { state, validUntil: access.validUntil };
  }
  if (access.validUntil !== undefined)
    throw new IntegrationError("incompatibleSchema");
  return { state };
}

function header(value: Record<string, unknown>) {
  version(value);
  requirePolicyVersion(value.accessPolicyVersion as number | undefined);
  return {
    accessPolicyVersion: ACCESS_POLICY_VERSION,
    schemaVersion: 1,
    minimumReaderVersion: number(value.minimumReaderVersion, true),
    producerInstanceID: uuid(value.producerInstanceID),
    namespaceEpoch: uuid(value.namespaceEpoch),
    appVersion: string(value.appVersion, 64),
    appBuild: string(value.appBuild, 64),
  };
}

export function parseDescriptor(value: unknown): Descriptor {
  const v = record(value);
  return { ...header(v), enabled: bool(v.enabled) };
}
export function parseSnapshot(value: unknown): Snapshot {
  const v = record(value);
  const sharedHeader = header(v);
  const access = parseAccess(v.access);
  if (!Array.isArray(v.tasks) || v.tasks.length > 5000)
    throw new IntegrationError("malformed");
  const tasks = v.tasks.map((item): DownloadTask => {
    const t = record(item);
    const progress = optional(t.progress, (p) => number(p));
    if (progress !== undefined && progress > 1)
      throw new IntegrationError("malformed");
    return {
      taskID: uuid(t.taskID),
      taskRevision: number(t.taskRevision, true),
      displayName: string(t.displayName),
      state: string(t.state, 64),
      engineKind: string(t.engineKind, 64),
      completedBytes: number(t.completedBytes, true),
      totalBytes: optional(t.totalBytes, (n) => number(n, true)),
      progress,
      speed: optional(t.speed, (n) => number(n)),
      waitingReason: optional(t.waitingReason, (s) => string(s, 64)),
      failureCode: optional(t.failureCode, (s) => string(s, 64)),
      availableActions: actions(t.availableActions),
      outputAvailability: string(t.outputAvailability, 64),
    };
  });
  if (new Set(tasks.map((t) => t.taskID)).size !== tasks.length)
    throw new IntegrationError("malformed");
  const totalTaskCount = number(v.totalTaskCount, true);
  const truncated = bool(v.truncated);
  if (
    totalTaskCount < tasks.length ||
    (!truncated && totalTaskCount !== tasks.length)
  )
    throw new IntegrationError("malformed");
  return {
    ...sharedHeader,
    access,
    snapshotRevision: number(v.snapshotRevision, true),
    generatedAt: number(v.generatedAt),
    lifecycle: enumeration(v.lifecycle, ["starting", "ready", "terminating"]),
    dataHealth: enumeration(v.dataHealth, [
      "loading",
      "ready",
      "reconciling",
      "unreadable",
    ]),
    capabilities: actions(v.capabilities),
    truncated,
    totalTaskCount,
    tasks,
  };
}

export function parseReceipt(value: unknown): Receipt {
  const v = record(value);
  version(v);
  const payloadHash = string(v.payloadHash, 64);
  if (!/^[0-9a-f]{64}$/.test(payloadHash))
    throw new IntegrationError("malformed");
  return {
    schemaVersion: 1,
    requestID: uuid(v.requestID),
    payloadHash,
    producerInstanceID: uuid(v.producerInstanceID),
    namespaceEpoch: uuid(v.namespaceEpoch),
    receiptRevision: number(v.receiptRevision, true),
    status: enumeration(v.status, RECEIPT_STATUSES),
    reasonCode: optional(v.reasonCode, (s) => string(s, 64)),
    updatedAt: number(v.updatedAt),
    resultingTaskID: optional(v.resultingTaskID, uuid),
    plannedTaskID: optional(v.plannedTaskID, uuid),
    failureRecordedTaskID: optional(v.failureRecordedTaskID, uuid),
  };
}

export function isFresh(snapshot: Snapshot, now = Date.now() / 1000): boolean {
  const age = now - snapshot.generatedAt;
  return age >= 0 && age <= STALE_AFTER_SECONDS;
}
export function requireReady(
  descriptor: Descriptor,
  snapshot: Snapshot,
  now = Date.now() / 1000,
): void {
  requireAccess(descriptor, snapshot, now);
  if (
    snapshot.producerInstanceID !== descriptor.producerInstanceID ||
    snapshot.namespaceEpoch !== descriptor.namespaceEpoch
  )
    throw new IntegrationError("stale");
  if (!isFresh(snapshot, now)) throw new IntegrationError("stale");
  if (snapshot.lifecycle !== "ready" || snapshot.dataHealth !== "ready")
    throw new IntegrationError("notReady");
}
export function requireAccess(
  descriptor: Descriptor,
  snapshot: Snapshot,
  now = Date.now() / 1000,
): void {
  requirePolicyVersion(descriptor.accessPolicyVersion);
  requirePolicyVersion(snapshot.accessPolicyVersion);
  if (!descriptor.enabled) throw new IntegrationError("integrationDisabled");
  const access = parseAccess(snapshot.access);
  switch (access.state) {
    case "licensed":
    case "trial":
      if (
        !Number.isFinite(now) ||
        access.validUntil === undefined ||
        access.validUntil <= now
      )
        throw new IntegrationError("accessExpired");
      return;
    case "checking":
      throw new IntegrationError("accessChecking");
    case "licenseRequired":
      throw new IntegrationError("licenseRequired");
    case "verificationRequired":
      throw new IntegrationError("verificationRequired");
    case "integrityBlocked":
      throw new IntegrationError("integrityBlocked");
  }
}

export function retainVisibleState<
  T extends { descriptor: Descriptor; snapshot: Snapshot },
>(
  previous: T | undefined,
  error?: unknown,
  now = Date.now() / 1000,
): T | undefined {
  if (!previous || mustClearSharedState(error)) return undefined;
  try {
    requireAccess(previous.descriptor, previous.snapshot, now);
    return previous;
  } catch {
    return undefined;
  }
}

export function validateURL(input: string): string {
  const value = input.trim();
  if (
    !value ||
    Buffer.byteLength(value, "utf8") > MAX_URL_BYTES ||
    /\s/.test(value) ||
    hasControl(value)
  )
    throw new IntegrationError("invalidURL");
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password
    )
      throw new Error();
  } catch {
    throw new IntegrationError("invalidURL");
  }
  return value;
}
export function safeURLPreview(input: string): string {
  try {
    const url = new URL(validateURL(input));
    return `${url.protocol}//${url.host}${url.pathname}${url.search ? "?…" : ""}`;
  } catch {
    return "Enter one HTTP or HTTPS URL";
  }
}

export type AppVerificationState =
  "unattempted" | "verifying" | "verified" | "failed";

/** A command's display session. Each action still performs a fresh signature verification. */
export class AppVerificationSession {
  private currentState: AppVerificationState = "unattempted";
  private currentGeneration = 0;

  get state(): AppVerificationState {
    return this.currentState;
  }
  get generation(): number {
    return this.currentGeneration;
  }
  canPoll(): boolean {
    return this.currentState === "verified";
  }
  accepts(generation: number): boolean {
    return this.canPoll() && generation === this.currentGeneration;
  }

  invalidate(): void {
    this.currentGeneration += 1;
    this.currentState = "failed";
  }

  async verify<T>(operation: () => Promise<T>): Promise<T> {
    const generation = ++this.currentGeneration;
    this.currentState = "verifying";
    try {
      const result = await operation();
      if (generation !== this.currentGeneration)
        throw new IntegrationError("cancelled");
      this.currentState = "verified";
      return result;
    } catch (error) {
      if (generation !== this.currentGeneration)
        throw new IntegrationError("cancelled");
      this.currentState = "failed";
      throw error;
    }
  }
}
