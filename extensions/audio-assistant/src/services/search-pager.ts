import type { Item, SearchPage, SearchRequest } from "../domain/model";
import { itemKey } from "../domain/policy";

export interface PagerState {
  items: Item[];
  loading: boolean;
  hasMore: boolean;
  error?: unknown;
  warnings?: string[];
}

/** A request generation owns its pages. Even transports that ignore abort cannot publish stale results. */
export class SearchPager {
  private abort = new AbortController();
  private cursor?: string;
  private started = false;
  private state: PagerState = { items: [], loading: false, hasMore: true };

  constructor(
    private readonly search: (request: SearchRequest, signal: AbortSignal) => Promise<SearchPage>,
    private readonly request: SearchRequest,
    private readonly publish: (state: PagerState) => void,
  ) {}

  async loadMore(): Promise<void> {
    if (this.abort.signal.aborted || this.state.loading || !this.state.hasMore) return;
    this.state = { ...this.state, loading: true, error: undefined };
    this.publish(this.state);
    try {
      const page = await this.search({ ...this.request, cursor: this.cursor }, this.abort.signal);
      if (this.abort.signal.aborted) return;
      const merged = new Map(this.state.items.map((item) => [itemKey(item), item]));
      for (const item of page.items) merged.set(itemKey(item), item);
      const hasMore = page.nextCursor !== undefined && (!this.started || page.nextCursor !== this.cursor);
      this.cursor = page.nextCursor;
      this.started = true;
      const warnings = page.warnings?.length
        ? Array.from(new Set([...(this.state.warnings ?? []), ...page.warnings]))
        : this.state.warnings;
      this.state = { items: [...merged.values()], loading: false, hasMore, warnings };
    } catch (error) {
      if (this.abort.signal.aborted) return;
      this.state = { ...this.state, loading: false, error };
    }
    this.publish(this.state);
  }

  dispose(): void {
    this.abort.abort();
  }
}
