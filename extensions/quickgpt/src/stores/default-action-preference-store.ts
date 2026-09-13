import { LocalStorage } from "@raycast/api";
import { createNamespacedCache } from "../utils/extension-cache";

interface CacheAdapter {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): unknown;
}

interface StorageAdapter {
  getItem<T extends string | number | boolean>(key: string): Promise<T | undefined>;
  setItem(key: string, value: string | number | boolean): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class DefaultActionPreferenceStore {
  private hydrationPromise?: Promise<void>;
  private hydrated = false;
  private revision = 0;

  constructor(
    private cache: CacheAdapter,
    private storage: StorageAdapter = LocalStorage,
    private key = "lastSelectedAction",
    private lastExecutedKey = "lastExecutedAction",
    private historyKey = "actionExecutionHistory",
    private historySize = 20,
  ) {}

  async hydrate(): Promise<void> {
    if (!this.hydrationPromise) {
      const startedRevision = this.revision;
      this.hydrationPromise = this.hydrateFromStorage(startedRevision).finally(() => {
        this.hydrated = true;
      });
    }

    return this.hydrationPromise;
  }

  isHydrated(): boolean {
    return this.hydrated;
  }

  async saveDefaultActionPreference(action: string): Promise<void> {
    this.revision += 1;
    this.cache.set(this.key, action);
    await this.persistValue(this.key, action);
  }

  getDefaultActionPreference(): string | undefined {
    return this.cache.get(this.key);
  }

  async saveLastExecutedAction(action: string): Promise<void> {
    if (action !== "lastUsed") {
      this.revision += 1;
      let history = this.getExecutionHistory();
      history.unshift(action);

      if (history.length > this.historySize) {
        history = history.slice(0, this.historySize);
      }

      const serializedHistory = JSON.stringify(history);
      this.cache.set(this.historyKey, serializedHistory);
      this.cache.set(this.lastExecutedKey, action);
      await Promise.all([
        this.persistValue(this.historyKey, serializedHistory),
        this.persistValue(this.lastExecutedKey, action),
      ]);
    }
  }

  private getExecutionHistory(): string[] {
    const historyJson = this.cache.get(this.historyKey);
    return parseExecutionHistory(historyJson) || [];
  }

  getMostFrequentlyUsedAction(lookbackCount: number = 5): string | undefined {
    const history = this.getExecutionHistory();
    if (history.length === 0) return undefined;

    const recentHistory = history.slice(0, Math.min(lookbackCount, history.length));
    const frequencyMap = new Map<string, number>();
    recentHistory.forEach((action) => {
      frequencyMap.set(action, (frequencyMap.get(action) || 0) + 1);
    });

    let mostFrequentAction: string | undefined;
    let maxFrequency = 0;

    frequencyMap.forEach((frequency, action) => {
      if (frequency > maxFrequency) {
        maxFrequency = frequency;
        mostFrequentAction = action;
      }
    });

    return mostFrequentAction;
  }

  getLastExecutedAction(): string | undefined {
    return this.getMostFrequentlyUsedAction(5) || this.cache.get(this.lastExecutedKey);
  }

  getExecutionHistoryPublic(): string[] {
    return this.getExecutionHistory();
  }

  async clearExecutionHistory(): Promise<void> {
    this.revision += 1;
    this.cache.remove(this.historyKey);
    this.cache.remove(this.lastExecutedKey);
    await Promise.all([this.removePersistedValue(this.historyKey), this.removePersistedValue(this.lastExecutedKey)]);
  }

  private async hydrateFromStorage(startedRevision: number): Promise<void> {
    const [storedDefaultAction, storedLastExecutedAction, storedHistoryJson] = await Promise.all([
      this.readStoredString(this.key),
      this.readStoredString(this.lastExecutedKey),
      this.readStoredString(this.historyKey),
    ]);

    if (startedRevision !== this.revision) {
      return;
    }

    const cachedDefaultAction = this.cache.get(this.key);
    const defaultAction = storedDefaultAction ?? cachedDefaultAction;
    if (defaultAction !== undefined) {
      this.cache.set(this.key, defaultAction);
      if (storedDefaultAction === undefined) {
        void this.persistValue(this.key, defaultAction);
      }
    }

    const cachedLastExecutedAction = this.cache.get(this.lastExecutedKey);
    const lastExecutedAction = storedLastExecutedAction ?? cachedLastExecutedAction;
    if (lastExecutedAction !== undefined) {
      this.cache.set(this.lastExecutedKey, lastExecutedAction);
      if (storedLastExecutedAction === undefined) {
        void this.persistValue(this.lastExecutedKey, lastExecutedAction);
      }
    }

    const cachedHistoryJson = this.cache.get(this.historyKey);
    const storageHistory = parseExecutionHistory(storedHistoryJson);
    const cacheHistory = parseExecutionHistory(cachedHistoryJson);
    const history = storageHistory ?? cacheHistory;
    if (history) {
      const serializedHistory = JSON.stringify(history.slice(0, this.historySize));
      this.cache.set(this.historyKey, serializedHistory);
      if (storedHistoryJson === undefined) {
        void this.persistValue(this.historyKey, serializedHistory);
      }
    }
  }

  private async readStoredString(key: string): Promise<string | undefined> {
    try {
      const value = await this.storage.getItem<string>(key);
      return typeof value === "string" ? value : undefined;
    } catch (error) {
      console.error(`Failed to read default action preference "${key}":`, error);
      return undefined;
    }
  }

  private async persistValue(key: string, value: string): Promise<void> {
    await this.storage.setItem(key, value).catch((error) => {
      console.error(`Failed to persist default action preference "${key}":`, error);
    });
  }

  private async removePersistedValue(key: string): Promise<void> {
    await this.storage.removeItem(key).catch((error) => {
      console.error(`Failed to remove default action preference "${key}":`, error);
    });
  }
}

function parseExecutionHistory(historyJson: string | undefined): string[] | undefined {
  if (historyJson === undefined) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(historyJson);
    if (!Array.isArray(parsed)) {
      return undefined;
    }

    return parsed.filter((action): action is string => typeof action === "string");
  } catch (e) {
    console.error("Failed to parse action history:", e);
    return undefined;
  }
}

const cache = createNamespacedCache("action-preferences-v1", [
  "lastSelectedAction",
  "lastExecutedAction",
  "actionExecutionHistory",
]);
const defaultActionPreferenceStore = new DefaultActionPreferenceStore(cache);

export default defaultActionPreferenceStore;
