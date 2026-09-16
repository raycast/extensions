import type { ComponentHistory, DataAvailability, ProviderStatusRecord } from "../domain/types";
import { assertComponentHistory } from "../domain/snapshot-validation";
import type { ProviderDefinition } from "../providers/types";
import { fetchOptionalEnrichment } from "../providers/utils/optional-enrichment";
import { recordFromCache, refreshProviderStatus } from "./fetch-provider-statuses";
import type { StatusCache } from "./status-cache";

interface StoreSnapshot {
  records: Readonly<Record<string, ProviderStatusRecord>>;
  isRefreshing: boolean;
}

export interface ComponentHistoryState {
  history?: ComponentHistory;
  availability?: DataAvailability;
  isLoading: boolean;
}

interface StoreOptions {
  now?: () => number;
  timeoutMs?: number;
  historyTimeoutMs?: number;
  concurrency?: number;
}

const EMPTY_HISTORY: ComponentHistoryState = { isLoading: false };

/** One owner for records and request lifetimes across the root list and pushed views. */
export class ProviderStatusStore {
  readonly #providers: ReadonlyMap<string, ProviderDefinition>;
  readonly #cache: StatusCache;
  readonly #options: StoreOptions;
  readonly #listeners = new Set<() => void>();
  readonly #requests = new Map<string, AbortController>();
  readonly #histories = new Map<string, ComponentHistoryState>();
  readonly #historyRequests = new Map<string, AbortController>();
  readonly #historyConsumers = new Map<string, Set<symbol>>();
  #batch: symbol | undefined;
  #state: StoreSnapshot;

  constructor(providers: readonly ProviderDefinition[], cache: StatusCache, options: StoreOptions = {}) {
    this.#providers = new Map(providers.map((provider) => [provider.id, provider]));
    this.#cache = cache;
    this.#options = options;
    const records = Object.fromEntries(providers.map(({ id }) => [id, recordFromCache(id, cache, options.now?.())]));
    this.#state = { records, isRefreshing: Object.values(records).some((record) => record.freshness !== "fresh") };
  }

  getSnapshot = (): StoreSnapshot => this.#state;

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  refreshAll = async (force = true): Promise<ProviderStatusRecord[]> => {
    const batch = Symbol("refresh");
    this.#batch = batch;
    const jobs = [...this.#providers.values()].map((provider) => ({ provider, controller: this.#begin(provider.id) }));
    this.#publish();
    const results = new Map<string, ProviderStatusRecord>();
    let next = 0;
    const worker = async () => {
      while (next < jobs.length && this.#batch === batch) {
        const { provider, controller } = jobs[next++]!;
        if (this.#requests.get(provider.id) !== controller) continue;
        const result = await this.#fetch(provider, controller, force);
        if (this.#requests.get(provider.id) === controller) results.set(provider.id, result);
      }
    };
    await Promise.all(
      Array.from({ length: Math.max(1, Math.min(this.#options.concurrency ?? 6, jobs.length)) }, worker),
    );
    if (this.#batch !== batch) return [];
    this.#batch = undefined;
    const current: ProviderStatusRecord[] = [];
    for (const { provider, controller } of jobs) {
      const result = results.get(provider.id);
      if (result && this.#requests.get(provider.id) === controller) {
        this.#requests.delete(provider.id);
        current.push(result);
      }
    }
    this.#commit(current);
    return current;
  };

  refreshProvider = async (providerId: string): Promise<ProviderStatusRecord | undefined> => {
    const provider = this.#provider(providerId);
    const controller = this.#begin(providerId);
    this.#publish();
    const result = await this.#fetch(provider, controller, true);
    if (this.#requests.get(providerId) !== controller) return undefined;
    this.#requests.delete(providerId);
    this.#commit([result]);
    return result;
  };

  getComponentHistory = (providerId: string, componentId: string): ComponentHistoryState =>
    this.#histories.get(this.#historyKey(providerId, componentId)) ?? EMPTY_HISTORY;

  /** Keep a selected component's request alive until its last view releases it. */
  watchComponentHistory(providerId: string, componentId: string): () => void {
    const provider = this.#provider(providerId);
    const component = this.#state.records[providerId]?.snapshot?.components.find(({ id }) => id === componentId);
    if (
      !component ||
      component.history ||
      component.historyAvailability === "unsupported" ||
      !provider.adapter.fetchComponentHistory
    )
      return () => {};
    const key = this.#historyKey(providerId, componentId);
    const consumer = Symbol("history view");
    const consumers = this.#historyConsumers.get(key) ?? new Set<symbol>();
    consumers.add(consumer);
    this.#historyConsumers.set(key, consumers);
    const previous = this.#histories.get(key);
    if (!this.#historyRequests.has(key) && (!previous || previous.availability === "unavailable")) {
      void this.#loadHistory(provider, componentId, key);
    }
    return () => {
      consumers.delete(consumer);
      if (consumers.size === 0 && this.#historyConsumers.get(key) === consumers) {
        this.#historyConsumers.delete(key);
        this.#cancelHistory(key);
      }
    };
  }

  /** Cancel outstanding work on command exit; the store can be mounted again. */
  cancel(): void {
    this.#batch = undefined;
    for (const request of this.#requests.values()) request.abort();
    this.#requests.clear();
    for (const key of this.#historyRequests.keys()) this.#cancelHistory(key);
    this.#historyConsumers.clear();
    const records = Object.fromEntries(
      Object.entries(this.#state.records).map(([id, record]) => [
        id,
        { ...record, refreshState: record.refreshState === "refreshing" ? ("idle" as const) : record.refreshState },
      ]),
    );
    this.#publish(records);
  }

  #provider(id: string): ProviderDefinition {
    const provider = this.#providers.get(id);
    if (!provider) throw new Error(`Unknown provider: ${id}`);
    return provider;
  }

  #begin(id: string): AbortController {
    this.#requests.get(id)?.abort();
    const controller = new AbortController();
    this.#requests.set(id, controller);
    this.#state = {
      ...this.#state,
      records: {
        ...this.#state.records,
        [id]: { ...this.#state.records[id]!, refreshState: "refreshing", refreshError: undefined },
      },
    };
    return controller;
  }

  async #fetch(
    provider: ProviderDefinition,
    controller: AbortController,
    force: boolean,
  ): Promise<ProviderStatusRecord> {
    try {
      return await refreshProviderStatus(provider, {
        ...this.#options,
        cache: this.#cache,
        force,
        signal: controller.signal,
        isCurrent: () => this.#requests.get(provider.id) === controller,
      });
    } catch (error) {
      // Cache reads can fail before the service reaches its own error handler.
      return {
        ...this.#state.records[provider.id]!,
        refreshState: "failed",
        refreshError: error instanceof Error && error.message ? error.message : "Could not refresh provider status",
      };
    }
  }

  #commit(results: ProviderStatusRecord[]): void {
    const records = { ...this.#state.records };
    for (const result of results) {
      if (records[result.providerId]?.snapshot?.fetchedAt !== result.snapshot?.fetchedAt) {
        for (const key of this.#histories.keys()) {
          if (key.startsWith(`${result.providerId}:`)) {
            this.#cancelHistory(key);
            this.#histories.delete(key);
          }
        }
      }
      records[result.providerId] = result;
    }
    this.#publish(records);
  }

  #historyKey(providerId: string, componentId: string): string {
    return `${providerId}:${componentId}:${this.#state.records[providerId]?.snapshot?.fetchedAt ?? "unknown"}`;
  }

  async #loadHistory(provider: ProviderDefinition, componentId: string, key: string): Promise<void> {
    const controller = new AbortController();
    this.#historyRequests.set(key, controller);
    this.#histories.set(key, { isLoading: true });
    this.#emit();
    try {
      const result = await fetchOptionalEnrichment(
        controller.signal,
        async (signal) => {
          const history = await provider.adapter.fetchComponentHistory!(componentId, signal);
          if (history) assertComponentHistory(history);
          return { history };
        },
        this.#options.historyTimeoutMs ?? 6_000,
      );
      if (this.#historyRequests.get(key) !== controller) return;
      this.#histories.set(key, {
        history: result?.history,
        availability: result === undefined ? "unavailable" : result.history ? "available" : "unsupported",
        isLoading: false,
      });
    } catch {
      // View cancellation removes the request; no failed status replaces its last result.
    } finally {
      if (this.#historyRequests.get(key) === controller) {
        this.#historyRequests.delete(key);
        this.#emit();
      }
    }
  }

  #cancelHistory(key: string): void {
    const request = this.#historyRequests.get(key);
    if (!request) return;
    this.#historyRequests.delete(key);
    request.abort();
    this.#histories.delete(key);
    this.#emit();
  }

  #publish(records = this.#state.records): void {
    this.#state = { records, isRefreshing: this.#requests.size > 0 };
    this.#emit();
  }

  #emit(): void {
    for (const listener of this.#listeners) listener();
  }
}
