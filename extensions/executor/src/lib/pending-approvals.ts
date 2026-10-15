import { pausedInteraction, record } from "./execution";
import type { ExecutionResult } from "./types";

const KEY_NAMESPACE = "executor.pending-approval.v1";

export interface PendingApprovalReference {
  executionId: string;
  title: string;
  createdAt: number;
  expiresAt?: number;
}

export interface PendingApprovalStorage {
  allItems(): Promise<Record<string, string | number | boolean>>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

function requireScope(scope: string): string {
  if (!scope) throw new Error("An account scope is required for pending approvals.");
  return encodeURIComponent(scope);
}

export function pendingApprovalKey(scope: string, executionId: string): string {
  if (!executionId) throw new Error("An execution identifier is required.");
  return `${KEY_NAMESPACE}:${requireScope(scope)}:${encodeURIComponent(executionId)}`;
}

function keyPrefix(scope: string): string {
  return `${KEY_NAMESPACE}:${requireScope(scope)}:`;
}

function timestamp(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function pendingApprovalTitle(address: string): string {
  const tail = address.split(".").at(-1) || "tool call";
  const words = tail
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  const label = words
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
  return `Review ${label || "Tool Call"}`;
}

export function pendingApprovalReference(
  result: ExecutionResult,
  createdAt = Date.now(),
): PendingApprovalReference | undefined {
  const paused = pausedInteraction(result);
  if (!paused) return undefined;
  const payload = record(result.structured);
  const expiresAt = timestamp(payload?.expiresAt);
  const address = typeof paused.interaction.address === "string" ? paused.interaction.address : "tool call";
  return {
    executionId: paused.executionId,
    title: pendingApprovalTitle(address),
    createdAt,
    ...(expiresAt === undefined ? {} : { expiresAt }),
  };
}

export function parsePendingApproval(value: unknown): PendingApprovalReference | undefined {
  if (typeof value !== "string") return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return undefined;
  }
  const row = record(parsed);
  if (!row) return undefined;
  const allowed = new Set(["executionId", "title", "createdAt", "expiresAt"]);
  if (Object.keys(row).some((key) => !allowed.has(key))) return undefined;
  if (typeof row.executionId !== "string" || !row.executionId) return undefined;
  if (typeof row.title !== "string" || !row.title) return undefined;
  if (typeof row.createdAt !== "number" || !Number.isFinite(row.createdAt)) return undefined;
  if (row.expiresAt !== undefined && (typeof row.expiresAt !== "number" || !Number.isFinite(row.expiresAt))) {
    return undefined;
  }
  return {
    executionId: row.executionId,
    title: row.title,
    createdAt: row.createdAt,
    ...(row.expiresAt === undefined ? {} : { expiresAt: row.expiresAt }),
  };
}

function localStorageAdapter(): PendingApprovalStorage {
  return {
    allItems: async () => (await import("@raycast/api")).LocalStorage.allItems(),
    setItem: async (key, value) => (await import("@raycast/api")).LocalStorage.setItem(key, value),
    removeItem: async (key) => (await import("@raycast/api")).LocalStorage.removeItem(key),
  };
}

export function createPendingApprovalStore(storage: PendingApprovalStorage, now = () => Date.now()) {
  return {
    async remember(scope: string, result: ExecutionResult): Promise<PendingApprovalReference | undefined> {
      const reference = pendingApprovalReference(result, now());
      if (!reference) return undefined;
      await storage.setItem(pendingApprovalKey(scope, reference.executionId), JSON.stringify(reference));
      return reference;
    },
    async forget(scope: string, executionId: string): Promise<void> {
      await storage.removeItem(pendingApprovalKey(scope, executionId));
    },
    async list(scope: string): Promise<PendingApprovalReference[]> {
      const prefix = keyPrefix(scope);
      const items = await storage.allItems();
      const current: PendingApprovalReference[] = [];
      const obsolete: string[] = [];
      for (const [key, value] of Object.entries(items)) {
        if (!key.startsWith(prefix)) continue;
        const reference = parsePendingApproval(value);
        if (!reference || (reference.expiresAt !== undefined && reference.expiresAt <= now())) {
          obsolete.push(key);
          continue;
        }
        current.push(reference);
      }
      await Promise.all(obsolete.map((key) => storage.removeItem(key)));
      return current.sort((left, right) => right.createdAt - left.createdAt);
    },
  };
}

export function rememberPendingApproval(
  scope: string,
  result: ExecutionResult,
): Promise<PendingApprovalReference | undefined> {
  return createPendingApprovalStore(localStorageAdapter()).remember(scope, result);
}

export function forgetPendingApproval(scope: string, executionId: string): Promise<void> {
  return createPendingApprovalStore(localStorageAdapter()).forget(scope, executionId);
}

export function listPendingApprovals(scope: string): Promise<PendingApprovalReference[]> {
  return createPendingApprovalStore(localStorageAdapter()).list(scope);
}
