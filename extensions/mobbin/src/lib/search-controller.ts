import { MobbinError, isAbortError, validateSearchQuery } from "./errors";
import { searchWithCache } from "./search-cache";
import type {
  AuthMode,
  MobbinReference,
  SearchClient,
  SearchOptions,
} from "./types";

export type SearchControllerState = {
  results: MobbinReference[];
  error?: Error;
  isLoading: boolean;
};

type SearchControllerDependencies = {
  client: SearchClient;
  authMode: AuthMode;
  onStateChange: (state: SearchControllerState) => void;
  onCompleted: (
    options: SearchOptions,
    signal: AbortSignal,
  ) => Promise<void> | void;
  debounceMs?: number;
};

export class MobbinSearchController {
  private activeController: AbortController | undefined;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;

  constructor(private readonly dependencies: SearchControllerDependencies) {}

  update(options: SearchOptions): void {
    this.cancel();
    const generation = ++this.generation;
    const controller = new AbortController();
    this.activeController = controller;
    const query = options.query.trim();

    if (!query) {
      this.emit({ results: [], isLoading: false }, generation);
      return;
    }

    try {
      validateSearchQuery(query);
    } catch (error) {
      this.emit(
        {
          results: [],
          error:
            error instanceof Error
              ? error
              : new MobbinError("Invalid Mobbin query.", "invalid-query"),
          isLoading: false,
        },
        generation,
      );
      return;
    }

    this.emit({ results: [], isLoading: false }, generation);
    this.debounceTimer = setTimeout(
      () => void this.execute({ ...options, query }, controller, generation),
      this.dependencies.debounceMs ?? 700,
    );
  }

  dispose(): void {
    this.cancel();
    this.generation += 1;
  }

  private cancel(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = undefined;
    this.activeController?.abort();
    this.activeController = undefined;
  }

  private async execute(
    options: SearchOptions,
    controller: AbortController,
    generation: number,
  ): Promise<void> {
    this.debounceTimer = undefined;
    this.emit({ results: [], isLoading: true }, generation);
    try {
      const results = await searchWithCache(
        this.dependencies.client,
        this.dependencies.authMode,
        options,
        controller.signal,
      );
      if (!this.isCurrent(controller, generation)) return;
      await this.dependencies.onCompleted(options, controller.signal);
      if (!this.isCurrent(controller, generation)) return;
      this.emit({ results, isLoading: false }, generation);
    } catch (error) {
      if (!this.isCurrent(controller, generation) || isAbortError(error))
        return;
      this.emit(
        {
          results: [],
          error:
            error instanceof Error
              ? error
              : new MobbinError("Unknown Mobbin error.", "unknown"),
          isLoading: false,
        },
        generation,
      );
    }
  }

  private isCurrent(controller: AbortController, generation: number): boolean {
    return (
      !controller.signal.aborted &&
      this.activeController === controller &&
      this.generation === generation
    );
  }

  private emit(state: SearchControllerState, generation: number): void {
    if (this.generation === generation) this.dependencies.onStateChange(state);
  }
}
