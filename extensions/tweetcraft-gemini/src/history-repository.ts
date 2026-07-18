import type { ErrorCategory, HistoryEntry, HistoryStatus, RewriteMode } from "./types";

export type HistoryStorageValue = string | number | boolean;

export type HistoryStorage = {
  allItems(): Promise<Record<string, HistoryStorageValue>>;
  getItem<T extends HistoryStorageValue>(key: string): Promise<T | undefined>;
  setItem(key: string, value: HistoryStorageValue): Promise<void>;
  removeItem(key: string): Promise<void>;
};

type HistoryRepositoryDependencies = {
  now: () => number;
  createId: () => string;
};

const LEGACY_STORAGE_KEY = "tweetcraft.history.v1";
const ENTRY_KEY_PREFIX = "tweetcraft.history.v2.entry.";
const MAX_ENTRIES = 50;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

const rewriteModes = new Set<RewriteMode>(["natural", "punchy", "short", "reply"]);
const historyStatuses = new Set<HistoryStatus>(["pending", "success", "error"]);
const errorCategories = new Set<ErrorCategory>([
  "timeout",
  "proxy",
  "network",
  "quota",
  "api_key",
  "model",
  "request",
  "unknown",
]);

function normalizeSourceText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<HistoryEntry>;

  return (
    typeof entry.id === "string" &&
    entry.id.length > 0 &&
    typeof entry.sourceText === "string" &&
    typeof entry.normalizedSourceText === "string" &&
    rewriteModes.has(entry.mode as RewriteMode) &&
    historyStatuses.has(entry.status as HistoryStatus) &&
    isOptionalString(entry.outputText) &&
    (entry.errorCategory === undefined || errorCategories.has(entry.errorCategory)) &&
    isOptionalString(entry.errorMessage) &&
    Number.isInteger(entry.attempts) &&
    (entry.attempts ?? 0) >= 1 &&
    typeof entry.createdAt === "number" &&
    Number.isFinite(entry.createdAt) &&
    typeof entry.updatedAt === "number" &&
    Number.isFinite(entry.updatedAt) &&
    typeof entry.lastAttemptAt === "number" &&
    Number.isFinite(entry.lastAttemptAt)
  );
}

function parseEntry(value: HistoryStorageValue): HistoryEntry | undefined {
  if (typeof value !== "string") return undefined;

  try {
    const parsed: unknown = JSON.parse(value);
    return isHistoryEntry(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function entryStorageKey(id: string): string {
  return `${ENTRY_KEY_PREFIX}${encodeURIComponent(id)}`;
}

function newestFirst(a: HistoryEntry, b: HistoryEntry): number {
  return b.updatedAt - a.updatedAt || a.id.localeCompare(b.id);
}

function removeRecentDuplicates(entries: HistoryEntry[]): { kept: HistoryEntry[]; removed: HistoryEntry[] } {
  const latestAttemptBySource = new Map<string, number>();
  const kept: HistoryEntry[] = [];
  const removed: HistoryEntry[] = [];

  for (const entry of [...entries].sort((a, b) => b.lastAttemptAt - a.lastAttemptAt || newestFirst(a, b))) {
    const sourceKey = `${entry.mode}\u0000${entry.normalizedSourceText}`;
    const latestAttempt = latestAttemptBySource.get(sourceKey);

    if (latestAttempt !== undefined && latestAttempt - entry.lastAttemptAt <= DUPLICATE_WINDOW_MS) {
      removed.push(entry);
      continue;
    }

    latestAttemptBySource.set(sourceKey, entry.lastAttemptAt);
    kept.push(entry);
  }

  return { kept, removed };
}

export function createHistoryRepository(
  storage: HistoryStorage,
  dependencies: HistoryRepositoryDependencies,
) {
  let operationQueue = Promise.resolve();

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = operationQueue.then(operation);
    operationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async function migrateLegacyHistory(items: Record<string, HistoryStorageValue>): Promise<void> {
    const legacyValue = items[LEGACY_STORAGE_KEY];
    if (typeof legacyValue !== "string") return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(legacyValue);
    } catch {
      // Corrupt legacy data must not make the recovery command unusable.
      await storage.removeItem(LEGACY_STORAGE_KEY);
      return;
    }

    if (Array.isArray(parsed)) {
      for (const entry of parsed.filter(isHistoryEntry)) {
        const key = entryStorageKey(entry.id);
        if (items[key] === undefined) {
          await storage.setItem(key, JSON.stringify(entry));
        }
      }
    }

    await storage.removeItem(LEGACY_STORAGE_KEY);
  }

  async function loadHistory(): Promise<HistoryEntry[]> {
    let items = await storage.allItems();
    if (items[LEGACY_STORAGE_KEY] !== undefined) {
      await migrateLegacyHistory(items);
      items = await storage.allItems();
    }

    const validEntries: HistoryEntry[] = [];
    const keysToRemove = new Set<string>();

    for (const [key, value] of Object.entries(items)) {
      if (!key.startsWith(ENTRY_KEY_PREFIX)) continue;
      const entry = parseEntry(value);

      if (!entry || entryStorageKey(entry.id) !== key) {
        keysToRemove.add(key);
      } else {
        validEntries.push(entry);
      }
    }

    const now = dependencies.now();
    const retained = validEntries.filter((entry) => {
      const shouldRetain = now - entry.updatedAt <= RETENTION_MS;
      if (!shouldRetain) keysToRemove.add(entryStorageKey(entry.id));
      return shouldRetain;
    });
    const { kept, removed } = removeRecentDuplicates(retained);
    for (const entry of removed) keysToRemove.add(entryStorageKey(entry.id));

    const sorted = kept.sort(newestFirst);
    for (const entry of sorted.slice(MAX_ENTRIES)) keysToRemove.add(entryStorageKey(entry.id));

    await Promise.all([...keysToRemove].map((key) => storage.removeItem(key)));
    return sorted.slice(0, MAX_ENTRIES);
  }

  async function saveEntry(entry: HistoryEntry): Promise<void> {
    await storage.setItem(entryStorageKey(entry.id), JSON.stringify(entry));
  }

  async function findEntry(id: string): Promise<HistoryEntry | undefined> {
    const value = await storage.getItem(entryStorageKey(id));
    return value === undefined ? undefined : parseEntry(value);
  }

  return {
    getHistory(): Promise<HistoryEntry[]> {
      return enqueue(loadHistory);
    },

    beginAttempt(sourceText: string, mode: RewriteMode): Promise<HistoryEntry> {
      return enqueue(async () => {
        const now = dependencies.now();
        const normalizedSourceText = normalizeSourceText(sourceText);
        const entries = await loadHistory();
        const duplicate = entries.find(
          (entry) =>
            entry.mode === mode &&
            entry.normalizedSourceText === normalizedSourceText &&
            now - entry.lastAttemptAt <= DUPLICATE_WINDOW_MS,
        );

        const current: HistoryEntry = duplicate
          ? {
              ...duplicate,
              sourceText,
              status: "pending",
              errorCategory: undefined,
              errorMessage: undefined,
              attempts: duplicate.attempts + 1,
              updatedAt: now,
              lastAttemptAt: now,
            }
          : {
              id: dependencies.createId(),
              sourceText,
              normalizedSourceText,
              mode,
              status: "pending",
              attempts: 1,
              createdAt: now,
              updatedAt: now,
              lastAttemptAt: now,
            };

        await saveEntry(current);
        await loadHistory();
        return current;
      });
    },

    markSuccess(id: string, outputText: string): Promise<HistoryEntry | undefined> {
      return enqueue(async () => {
        const entry = await findEntry(id);
        if (!entry) return undefined;
        const updated: HistoryEntry = {
          ...entry,
          status: "success",
          outputText,
          errorCategory: undefined,
          errorMessage: undefined,
          updatedAt: dependencies.now(),
        };
        await saveEntry(updated);
        return updated;
      });
    },

    markError(
      id: string,
      errorCategory: ErrorCategory,
      errorMessage: string,
    ): Promise<HistoryEntry | undefined> {
      return enqueue(async () => {
        const entry = await findEntry(id);
        if (!entry) return undefined;
        const updated: HistoryEntry = {
          ...entry,
          status: "error",
          errorCategory,
          errorMessage,
          updatedAt: dependencies.now(),
        };
        await saveEntry(updated);
        return updated;
      });
    },

    beginRetry(entry: HistoryEntry): Promise<HistoryEntry> {
      return enqueue(async () => {
        const storedEntry = (await findEntry(entry.id)) ?? entry;
        const now = dependencies.now();
        const updated: HistoryEntry = {
          ...storedEntry,
          status: "pending",
          errorCategory: undefined,
          errorMessage: undefined,
          attempts: storedEntry.attempts + 1,
          updatedAt: now,
          lastAttemptAt: now,
        };
        await saveEntry(updated);
        return updated;
      });
    },

    deleteEntry(id: string): Promise<void> {
      return enqueue(() => storage.removeItem(entryStorageKey(id)));
    },

    clear(): Promise<void> {
      return enqueue(async () => {
        const items = await storage.allItems();
        const keys = Object.keys(items).filter(
          (key) => key === LEGACY_STORAGE_KEY || key.startsWith(ENTRY_KEY_PREFIX),
        );
        await Promise.all(keys.map((key) => storage.removeItem(key)));
      });
    },
  };
}

export const historyPolicy = {
  maxEntries: MAX_ENTRIES,
  retentionDays: 30,
  duplicateWindowMinutes: 5,
} as const;
