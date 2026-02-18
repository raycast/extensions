const COMPLETION_OUTBOX_KEY = "dynamic-pomodoro-completion-outbox-v1";

declare function require(name: "@raycast/api"): typeof import("@raycast/api");

export type CompletionDeliveryStatus = "pending" | "delivering" | "delivered" | "failed";

export type CompletionOutboxEvent = {
  completionId: number;
  status: CompletionDeliveryStatus;
  retries: number;
  launchType?: string;
  createdAt: number;
  updatedAt: number;
  lockedAt?: number;
  deliveredAt?: number;
  failedAt?: number;
  nextRetryAt?: number;
  lastError?: string;
  lockId?: string;
};

export type CompletionOutboxStore = {
  getRaw: () => Promise<string | null | undefined>;
  setRaw: (value: string) => Promise<void>;
};

type OutboxDeps = {
  store?: CompletionOutboxStore;
  now?: () => number;
};

const defaultStore: CompletionOutboxStore = {
  getRaw: async () => {
    try {
      const { LocalStorage } = require("@raycast/api");
      return await LocalStorage.getItem<string>(COMPLETION_OUTBOX_KEY);
    } catch {
      return null;
    }
  },
  setRaw: async (value: string) => {
    try {
      const { LocalStorage } = require("@raycast/api");
      await LocalStorage.setItem(COMPLETION_OUTBOX_KEY, value);
    } catch {
      // Outbox persistence is best-effort and must not break timer flow.
    }
  },
};

function normalizeEvent(input: unknown): CompletionOutboxEvent | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }

  const value = input as Record<string, unknown>;
  const completionId = Number(value.completionId);
  const status = value.status;
  const retries = Number(value.retries);
  const createdAt = Number(value.createdAt);
  const updatedAt = Number(value.updatedAt);

  if (!Number.isFinite(completionId) || !Number.isFinite(retries) || !Number.isFinite(createdAt) || !Number.isFinite(updatedAt)) {
    return null;
  }
  if (status !== "pending" && status !== "delivering" && status !== "delivered" && status !== "failed") {
    return null;
  }

  const launchType = typeof value.launchType === "string" ? value.launchType : undefined;
  const lockedAt = Number(value.lockedAt);
  const deliveredAt = Number(value.deliveredAt);
  const failedAt = Number(value.failedAt);
  const nextRetryAt = Number(value.nextRetryAt);
  const lastError = typeof value.lastError === "string" ? value.lastError : undefined;
  const lockId = typeof value.lockId === "string" ? value.lockId : undefined;

  return {
    completionId,
    status,
    retries,
    launchType,
    createdAt,
    updatedAt,
    lockedAt: Number.isFinite(lockedAt) ? lockedAt : undefined,
    deliveredAt: Number.isFinite(deliveredAt) ? deliveredAt : undefined,
    failedAt: Number.isFinite(failedAt) ? failedAt : undefined,
    nextRetryAt: Number.isFinite(nextRetryAt) ? nextRetryAt : undefined,
    lastError,
    lockId,
  };
}

async function readEvents(store: CompletionOutboxStore): Promise<CompletionOutboxEvent[]> {
  try {
    const raw = await store.getRaw();
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => normalizeEvent(item))
      .filter((item): item is CompletionOutboxEvent => item !== null)
      .sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

async function writeEvents(store: CompletionOutboxStore, events: CompletionOutboxEvent[]): Promise<void> {
  await store.setRaw(JSON.stringify(events));
}

function mergeEvents(current: CompletionOutboxEvent[], proposed: CompletionOutboxEvent[]): CompletionOutboxEvent[] {
  const byId = new Map<number, CompletionOutboxEvent>();
  for (const event of current) {
    byId.set(event.completionId, event);
  }

  for (const event of proposed) {
    const existing = byId.get(event.completionId);
    if (!existing) {
      byId.set(event.completionId, event);
      continue;
    }
    if (existing.status === "delivered" || event.status === "delivered") {
      byId.set(event.completionId, existing.status === "delivered" ? existing : event);
      continue;
    }
    byId.set(event.completionId, event.updatedAt >= existing.updatedAt ? event : existing);
  }

  return Array.from(byId.values()).sort((a, b) => a.createdAt - b.createdAt);
}

async function writeEventsWithMerge(store: CompletionOutboxStore, proposed: CompletionOutboxEvent[]): Promise<void> {
  const latest = await readEvents(store);
  await writeEvents(store, mergeEvents(latest, proposed));
}

function withDefaults(deps?: OutboxDeps): Required<OutboxDeps> {
  return {
    store: deps?.store ?? defaultStore,
    now: deps?.now ?? (() => Date.now()),
  };
}

function updateEvent(
  events: CompletionOutboxEvent[],
  completionId: number,
  updater: (event: CompletionOutboxEvent) => CompletionOutboxEvent,
): CompletionOutboxEvent[] {
  return events.map((event) => {
    if (event.completionId !== completionId) {
      return event;
    }
    return updater(event);
  });
}

export async function getCompletionOutboxEvents(deps?: OutboxDeps): Promise<CompletionOutboxEvent[]> {
  const merged = withDefaults(deps);
  return await readEvents(merged.store);
}

export async function getCompletionEvent(completionId: number, deps?: OutboxDeps): Promise<CompletionOutboxEvent | undefined> {
  const events = await getCompletionOutboxEvents(deps);
  return events.find((event) => event.completionId === completionId);
}

export async function upsertPendingEvent(
  input: { completionId: number; launchType?: string },
  deps?: OutboxDeps,
): Promise<CompletionOutboxEvent> {
  const merged = withDefaults(deps);
  const events = await readEvents(merged.store);
  const existing = events.find((event) => event.completionId === input.completionId);
  if (existing) {
    return existing;
  }

  const now = merged.now();
  const created: CompletionOutboxEvent = {
    completionId: input.completionId,
    status: "pending",
    retries: 0,
    launchType: input.launchType,
    createdAt: now,
    updatedAt: now,
  };

  await writeEventsWithMerge(merged.store, [...events, created].sort((a, b) => a.createdAt - b.createdAt));
  return created;
}

export async function lockEventForDelivery(completionId: number, deps?: OutboxDeps): Promise<CompletionOutboxEvent | undefined> {
  const merged = withDefaults(deps);
  const events = await readEvents(merged.store);
  const target = events.find((event) => event.completionId === completionId);
  if (!target) {
    return undefined;
  }
  if (target.status === "delivered") {
    return target;
  }

  const now = merged.now();
  const lockId = `${completionId}-${now}-${Math.random().toString(36).slice(2, 10)}`;
  if (target.status === "failed" && target.nextRetryAt !== undefined && target.nextRetryAt > now) {
    return undefined;
  }

  const updated: CompletionOutboxEvent = {
    ...target,
    status: "delivering",
    lockedAt: now,
    lockId,
    updatedAt: now,
  };

  await writeEventsWithMerge(merged.store, updateEvent(events, completionId, () => updated));
  return updated;
}

export async function isLockOwner(
  completionId: number,
  lockId: string | undefined,
  deps?: OutboxDeps,
): Promise<boolean> {
  if (!lockId) {
    return false;
  }
  const event = await getCompletionEvent(completionId, deps);
  return Boolean(event && event.status === "delivering" && event.lockId === lockId);
}

export async function markEventDelivered(
  completionId: number,
  deps?: OutboxDeps & { expectedLockId?: string },
): Promise<CompletionOutboxEvent | undefined> {
  const merged = withDefaults(deps);
  const events = await readEvents(merged.store);
  const target = events.find((event) => event.completionId === completionId);
  if (!target) {
    return undefined;
  }
  if (deps?.expectedLockId && target.lockId !== deps.expectedLockId) {
    return undefined;
  }
  if (target.status === "delivered") {
    return target;
  }

  const now = merged.now();
  const deliveredAt = target.deliveredAt ?? now;
  const updated: CompletionOutboxEvent = {
    ...target,
    status: "delivered",
    deliveredAt,
    failedAt: undefined,
    nextRetryAt: undefined,
    lockedAt: undefined,
    lockId: undefined,
    lastError: undefined,
    updatedAt: now,
  };

  await writeEventsWithMerge(merged.store, updateEvent(events, completionId, () => updated));
  return updated;
}

export async function markEventFailed(
  completionId: number,
  params?: OutboxDeps & { baseDelayMs?: number; maxDelayMs?: number; error?: unknown; expectedLockId?: string },
): Promise<CompletionOutboxEvent | undefined> {
  const merged = withDefaults(params);
  const events = await readEvents(merged.store);
  const target = events.find((event) => event.completionId === completionId);
  if (!target) {
    return undefined;
  }
  if (params?.expectedLockId && target.lockId !== params.expectedLockId) {
    return undefined;
  }
  if (target.status === "delivered") {
    return target;
  }

  const now = merged.now();
  const retries = target.retries + 1;
  const baseDelayMs = Math.max(1, Math.round(params?.baseDelayMs ?? 2_000));
  const maxDelayMs = Math.max(baseDelayMs, Math.round(params?.maxDelayMs ?? 60_000));
  const delayMs = Math.min(maxDelayMs, baseDelayMs * 2 ** (retries - 1));
  const updated: CompletionOutboxEvent = {
    ...target,
    status: "failed",
    retries,
    failedAt: now,
    nextRetryAt: now + delayMs,
    lockedAt: undefined,
    lockId: undefined,
    lastError: params?.error ? String(params.error) : undefined,
    updatedAt: now,
  };

  await writeEventsWithMerge(merged.store, updateEvent(events, completionId, () => updated));
  return updated;
}

export async function getDeliverableEvents(params?: OutboxDeps & { limit?: number }): Promise<CompletionOutboxEvent[]> {
  const merged = withDefaults(params);
  const now = merged.now();
  const limit = Math.max(1, Math.round(params?.limit ?? 20));
  const events = await readEvents(merged.store);

  return events
    .filter((event) => {
      if (event.status === "pending") {
        return true;
      }
      if (event.status !== "failed") {
        return false;
      }
      if (event.nextRetryAt === undefined) {
        return true;
      }
      return event.nextRetryAt <= now;
    })
    .slice(0, limit);
}
