import type {
  SearchEngine,
  SearchEngineType,
  SearchError,
  SearchOptions,
  SearchResult,
  SearchStatus,
} from "../types/search.ts";
import { normalizeSearchOptions } from "../utils/search-options.ts";
import { searchWithFallback, type EngineFailure } from "./search-engine-resolver.ts";

/** A single minified line must not be able to blow up React state or the row layout. */
export const MAX_PREVIEW_LENGTH = 300;
/** Results are pushed to React in batches to keep the rerender count bounded. */
const RESULT_BATCH_SIZE = 50;
const BATCH_INTERVAL_MS = 100;

export interface SearchState {
  status: SearchStatus;
  results: SearchResult[];
  /** Engine that produced `results`; null until a search settles. */
  engine: SearchEngineType | null;
  /** Engines tried and skipped before the active one. */
  failures: EngineFailure[];
  limitReached: boolean;
  error: SearchError | null;
}

export const IDLE_STATE: SearchState = {
  status: "idle",
  results: [],
  engine: null,
  failures: [],
  limitReached: false,
  error: null,
};

function truncate(value: string): string {
  return value.length > MAX_PREVIEW_LENGTH ? `${value.slice(0, MAX_PREVIEW_LENGTH)}…` : value;
}

export function truncateResult(result: SearchResult): SearchResult {
  return {
    ...result,
    lineText: truncate(result.lineText),
    ...(result.contextBefore ? { contextBefore: result.contextBefore.map(truncate) } : {}),
    ...(result.contextAfter ? { contextAfter: result.contextAfter.map(truncate) } : {}),
  };
}

function toSearchError(error: unknown): SearchError {
  if (typeof error === "object" && error !== null && "kind" in error && "message" in error) return error as SearchError;
  return { kind: "unexpected", message: error instanceof Error ? error.message : String(error) };
}

/**
 * Framework-free search lifecycle: debounce, cancellation, generation-guarded
 * stale-event dropping and bounded batched state updates. Kept out of the React
 * hook so the timing behavior is testable without a renderer.
 *
 * Every callback carries the generation it was started with; anything that
 * arrives after a new search (or a cancel/dispose) bumped the counter is
 * dropped, so a slow engine can never write into the next query's results.
 */
export class SearchRunner {
  private readonly engines: SearchEngine[];
  private readonly debounceMs: number;
  private readonly onState: (state: SearchState) => void;
  private state: SearchState = IDLE_STATE;
  private generation = 0;
  private pending: { query: string; directory: string; options: SearchOptions } | null = null;
  private controller: AbortController | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private buffer: SearchResult[] = [];

  constructor(engines: SearchEngine[], debounceMs: number, onState: (state: SearchState) => void) {
    this.engines = engines;
    this.debounceMs = debounceMs;
    this.onState = onState;
  }

  /** Starts a debounced search; an empty query or missing directory just clears state. */
  search(query: string, directory: string | null, options: SearchOptions): void {
    this.stop();
    const trimmed = query.trim();
    if (trimmed.length === 0 || directory === null) {
      this.pending = null;
      this.setState(IDLE_STATE);
      return;
    }
    this.pending = { query: trimmed, directory, options: normalizeSearchOptions(options) };
    this.setState({ ...IDLE_STATE, status: "searching" });
    this.debounceTimer = setTimeout(() => this.start(), this.debounceMs);
  }

  /** Reruns the current query immediately, without waiting for the debounce. */
  refresh(): void {
    const pending = this.pending;
    if (pending === null) return;
    this.stop();
    this.pending = pending;
    this.setState({ ...IDLE_STATE, status: "searching" });
    this.start();
  }

  cancel(): void {
    if (this.state.status !== "searching") return;
    this.stop();
    this.setState({ ...this.state, status: "cancelled" });
  }

  /** Call on unmount: kills timers and the child process behind the active engine. */
  dispose(): void {
    this.stop();
    this.pending = null;
  }

  private stop(): void {
    this.generation++;
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    if (this.flushTimer !== null) clearTimeout(this.flushTimer);
    this.debounceTimer = null;
    this.flushTimer = null;
    this.buffer = [];
    this.controller?.abort();
    this.controller = null;
  }

  private start(): void {
    const pending = this.pending;
    if (pending === null) return;
    this.debounceTimer = null;
    const generation = this.generation;
    const controller = new AbortController();
    this.controller = controller;

    searchWithFallback(
      {
        query: pending.query,
        directory: pending.directory,
        options: pending.options,
        signal: controller.signal,
        onResults: (batch) => this.receive(batch, generation, pending.options.maxResults),
      },
      this.engines,
    ).then(
      (completion) => {
        if (generation !== this.generation) return;
        this.flush(generation);
        this.setState({
          ...this.state,
          status: completion.cancelled ? "cancelled" : "done",
          engine: completion.engine,
          failures: completion.failures,
          limitReached: completion.limitReached,
        });
      },
      (error: unknown) => {
        if (generation !== this.generation) return;
        this.flush(generation);
        this.setState({ ...this.state, status: "error", error: toSearchError(error) });
      },
    );
  }

  private receive(batch: SearchResult[], generation: number, maxResults: number): void {
    if (generation !== this.generation) return;
    const room = maxResults - this.state.results.length - this.buffer.length;
    if (room <= 0) return;
    for (const result of batch.slice(0, room)) this.buffer.push(truncateResult(result));
    if (this.buffer.length >= RESULT_BATCH_SIZE) {
      this.flush(generation);
    } else if (this.flushTimer === null) {
      this.flushTimer = setTimeout(() => this.flush(generation), BATCH_INTERVAL_MS);
    }
  }

  private flush(generation: number): void {
    if (this.flushTimer !== null) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    if (generation !== this.generation || this.buffer.length === 0) return;
    const batch = this.buffer;
    this.buffer = [];
    this.setState({ ...this.state, results: [...this.state.results, ...batch] });
  }

  private setState(state: SearchState): void {
    this.state = state;
    this.onState(state);
  }
}
