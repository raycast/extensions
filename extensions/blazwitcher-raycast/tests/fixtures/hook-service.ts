import type {
  DataSnapshot,
  SearchPage,
  SearchRequest,
} from "../../src/browser/service-types";

export interface PendingSearch {
  request: SearchRequest;
  resolve: (page: SearchPage) => void;
}
export const pendingSearches: PendingSearch[] = [];
export const currentService = {
  refreshSnapshot: () => {},
};

export class BrowserService {
  private version = 1;

  constructor(private publish: (snapshot: DataSnapshot) => void) {
    currentService.refreshSnapshot = () => this.refreshSnapshot();
  }

  async configure() {
    this.publishSnapshot();
  }

  pause() {}
  cancel() {}
  clearPreviewCache() {
    return true;
  }

  search(request: SearchRequest): Promise<SearchPage> {
    return new Promise((resolve) => {
      pendingSearches.push({ request, resolve });
    });
  }

  refreshSnapshot() {
    this.version++;
    this.publishSnapshot();
  }

  private publishSnapshot() {
    this.publish({
      version: this.version,
      profiles: [],
      profileId: "Default",
      states: {
        tab: { loading: false, warnings: [], count: 1 },
        history: { loading: false, warnings: [], count: 1 },
        bookmark: { loading: false, warnings: [], count: 1 },
      },
    });
  }
}

export function resolveSearch(pending: PendingSearch, id: string, total = 1) {
  pending.resolve({
    ...pending.request,
    total,
    results: [
      {
        entry: {
          id,
          title: id,
          url: "https://example.com/" + id,
          source:
            pending.request.scope === "all" ? "tab" : pending.request.scope,
        },
        titleRanges: [],
        urlRanges: [],
        score: 0,
      },
    ],
  });
}
