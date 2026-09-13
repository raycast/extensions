import { createHash } from "node:crypto";

import { ValidationError } from "../domain/errors";
import type { TaskDestinationPreferencePort, TaskDestinationScope } from "../application/taskDestination";

export const LEGACY_DEFAULT_DESTINATION_KEY = "defaultAddList";
export const TASK_DESTINATION_STORAGE_PREFIX = "ticktick.defaultDestination.v1";

export interface TaskDestinationStoragePort {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const INVALID_PREFERENCE_MESSAGE = "Invalid task destination preference.";
const BACKEND_IDS = new Set(["mcp", "openapi", "macos-legacy"]);

export function taskDestinationStorageKey(scope: TaskDestinationScope): string {
  const snapshot = snapshotScope(scope);
  const accountHash = createHash("sha256").update(snapshot.accountKey).digest("hex");
  return `${TASK_DESTINATION_STORAGE_PREFIX}.${snapshot.backendId}.${accountHash}`;
}

export class TaskDestinationPreferenceStore implements TaskDestinationPreferencePort {
  private readonly currentValues = new Map<string, string | undefined>();
  private readonly revisions = new Map<string, number>();
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(private readonly storage: TaskDestinationStoragePort) {}

  load(scope: TaskDestinationScope): Promise<string | undefined> {
    const key = taskDestinationStorageKey(scope);
    const revisionAtStart = this.revision(key);

    return this.enqueue(async () => {
      let scopedValue: unknown;
      try {
        scopedValue = await this.storage.getItem(key);
      } catch {
        return this.valueAfterReadFailure(key, revisionAtStart);
      }

      if (this.revision(key) !== revisionAtStart) return this.currentValues.get(key);
      if (scopedValue !== undefined) {
        const normalized = normalizeProjectId(scopedValue);
        this.currentValues.set(key, normalized);
        return normalized;
      }

      let legacyValue: unknown;
      try {
        legacyValue = await this.storage.getItem(LEGACY_DEFAULT_DESTINATION_KEY);
      } catch {
        return this.valueAfterReadFailure(key, revisionAtStart);
      }

      if (this.revision(key) !== revisionAtStart) return this.currentValues.get(key);
      const normalizedLegacy = normalizeProjectId(legacyValue);
      if (normalizedLegacy === undefined) {
        this.currentValues.set(key, undefined);
        return undefined;
      }

      try {
        await this.storage.setItem(key, normalizedLegacy);
      } catch {
        if (this.revision(key) === revisionAtStart) this.currentValues.set(key, normalizedLegacy);
        return this.currentValues.get(key);
      }

      if (this.revision(key) !== revisionAtStart) return this.currentValues.get(key);
      this.currentValues.set(key, normalizedLegacy);
      await ignoreFailure(() => this.storage.removeItem(LEGACY_DEFAULT_DESTINATION_KEY));
      return normalizedLegacy;
    });
  }

  async remember(scope: TaskDestinationScope, projectId: string): Promise<void> {
    const key = taskDestinationStorageKey(scope);
    const normalized = normalizeProjectId(projectId);
    if (normalized === undefined) throw new ValidationError(INVALID_PREFERENCE_MESSAGE);

    this.currentValues.set(key, normalized);
    this.revisions.set(key, this.revision(key) + 1);

    await this.enqueue(async () => {
      await this.storage.setItem(key, normalized);
      await ignoreFailure(() => this.storage.removeItem(LEGACY_DEFAULT_DESTINATION_KEY));
    });
  }

  private revision(key: string): number {
    return this.revisions.get(key) ?? 0;
  }

  private valueAfterReadFailure(key: string, expectedRevision: number): string | undefined {
    return this.revision(key) === expectedRevision ? undefined : this.currentValues.get(key);
  }

  private enqueue<Result>(operation: () => Promise<Result>): Promise<Result> {
    const queued = this.operationQueue.then(operation, operation);
    this.operationQueue = queued.then(
      () => undefined,
      () => undefined
    );
    return queued;
  }
}

function snapshotScope(value: unknown): { backendId: TaskDestinationScope["backendId"]; accountKey: string } {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return invalidPreference();
    const candidate = value as Partial<TaskDestinationScope>;
    const backendId = candidate.backendId;
    const accountKey = candidate.accountKey;
    if (!BACKEND_IDS.has(backendId as string) || !isSafeAccountKey(accountKey)) {
      return invalidPreference();
    }
    return { backendId: backendId as TaskDestinationScope["backendId"], accountKey };
  } catch {
    return invalidPreference();
  }
}

function isSafeAccountKey(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) return false;

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x1f || (codeUnit >= 0x7f && codeUnit <= 0x9f)) return false;
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) return false;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }

  return !Array.from(value).some((character) => /\p{Cf}/u.test(character));
}

function normalizeProjectId(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) return undefined;

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x1f || (codeUnit >= 0x7f && codeUnit <= 0x9f)) return undefined;
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) return undefined;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return undefined;
    }
  }

  return Array.from(value).some((character) => /\p{Cf}/u.test(character)) ? undefined : value;
}

function invalidPreference(): never {
  throw new ValidationError(INVALID_PREFERENCE_MESSAGE);
}

async function ignoreFailure(operation: () => Promise<unknown>): Promise<void> {
  try {
    await operation();
  } catch {
    // A confirmed scoped write remains authoritative even if legacy cleanup fails.
  }
}
