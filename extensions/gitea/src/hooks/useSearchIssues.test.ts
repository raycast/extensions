import { beforeEach, describe, expect, it, vi } from "vitest";
import { CacheKey, DEFAULT_PAGE_SIZE } from "../constants";
import { searchIssues, type SearchIssuesParams } from "../services/issues";
import type { Issue } from "../types/api";
import { useSearchIssues, type UseSearchIssuesParams } from "./useSearchIssues";

type SearchIssueData = {
  page: number;
  paramsKey: string;
  result: {
    items: Issue[];
    hasMore: boolean;
  };
};

const reactState = vi.hoisted(() => ({
  states: [] as unknown[],
  refs: [] as Array<{ current: unknown }>,
  stateIndex: 0,
  refIndex: 0,
}));

const cachedPromise = vi.hoisted(() => ({
  fn: undefined as ((cacheKey: string, page: number, paramsKey: string) => Promise<SearchIssueData>) | undefined,
  args: undefined as readonly [string, number, string] | undefined,
  options: undefined as
    | {
        onData?: (data: SearchIssueData) => void;
        onError?: (error: unknown) => void;
      }
    | undefined,
  revalidate: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock("react", () => ({
  useMemo: (factory: () => unknown) => factory(),
  useRef: (initialValue: unknown) => {
    const index = reactState.refIndex++;
    if (!reactState.refs[index]) {
      reactState.refs[index] = { current: initialValue };
    }
    return reactState.refs[index];
  },
  useState: (initialValue: unknown) => {
    const index = reactState.stateIndex++;
    if (reactState.states[index] === undefined) {
      reactState.states[index] = initialValue;
    }

    return [
      reactState.states[index],
      (nextValue: unknown) => {
        reactState.states[index] =
          typeof nextValue === "function"
            ? (nextValue as (current: unknown) => unknown)(reactState.states[index])
            : nextValue;
      },
    ];
  },
}));

vi.mock("@raycast/utils", () => ({
  showFailureToast: vi.fn(),
  useCachedPromise: vi.fn(
    (fn: typeof cachedPromise.fn, args: readonly [string, number, string], options: typeof cachedPromise.options) => {
      cachedPromise.fn = fn;
      cachedPromise.args = args;
      cachedPromise.options = options;
      return {
        isLoading: false,
        revalidate: cachedPromise.revalidate,
        mutate: cachedPromise.mutate,
      };
    },
  ),
}));

vi.mock("../services/issues", () => ({
  searchIssues: vi.fn(async (params: SearchIssuesParams) => ({
    items: [
      {
        id: params.page,
        title: `${params.state}-${params.owner}-${params.repo}-${params.query}-${params.page}`,
      } as Issue,
    ],
    hasMore: params.page === 1,
  })),
}));

const mockedSearchIssues = vi.mocked(searchIssues);

describe("useSearchIssues", () => {
  beforeEach(() => {
    reactState.states = [];
    reactState.refs = [];
    reactState.stateIndex = 0;
    reactState.refIndex = 0;
    cachedPromise.fn = undefined;
    cachedPromise.args = undefined;
    cachedPromise.options = undefined;
    vi.clearAllMocks();
  });

  it("fetches the first page with search parameters", async () => {
    renderSearchHook(baseParams());

    expect(cachedPromise.args).toEqual([
      CacheKey.IssueSearch,
      1,
      '{"owner":"alice","query":"bug","repo":"app","state":"open"}',
    ]);

    await publishPageFromFetch();

    expect(mockedSearchIssues).toHaveBeenCalledWith({
      state: "open",
      owner: "alice",
      repo: "app",
      query: "bug",
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
    });
  });

  it("loads and appends an additional page", async () => {
    let result = renderSearchHook(baseParams());

    await publishPageFromFetch();
    result = renderSearchHook(baseParams());
    expect(result.items.map((item) => item.title)).toEqual(["open-alice-app-bug-1"]);
    expect(result.pagination.hasMore).toBe(true);

    result.pagination.onLoadMore();
    result = renderSearchHook(baseParams());
    expect(cachedPromise.args?.[1]).toBe(2);

    await publishPageFromFetch();
    result = renderSearchHook(baseParams());

    expect(result.items.map((item) => item.title)).toEqual(["open-alice-app-bug-1", "open-alice-app-bug-2"]);
    expect(result.pagination.hasMore).toBe(false);
  });

  it.each([
    ["state", { state: "closed" }],
    ["owner", { owner: "bob" }],
    ["repo", { repo: "server" }],
    ["query", { query: "crash" }],
  ] satisfies Array<[string, Partial<UseSearchIssuesParams>]>)(
    "resets pagination when %s changes",
    async (_name, change) => {
      let result = renderSearchHook(baseParams());
      await publishPageFromFetch();
      result = renderSearchHook(baseParams());
      result.pagination.onLoadMore();

      result = renderSearchHook({ ...baseParams(), ...change });

      expect(result.items).toEqual([]);
      expect(result.pagination.hasMore).toBe(true);
      expect(cachedPromise.args?.[1]).toBe(1);
    },
  );
});

function renderSearchHook(params: UseSearchIssuesParams) {
  reactState.stateIndex = 0;
  reactState.refIndex = 0;

  return useSearchIssues(params);
}

function baseParams(): UseSearchIssuesParams {
  return {
    state: "open",
    owner: "alice",
    repo: "app",
    query: "bug",
  };
}

async function runCachedPromise() {
  if (!cachedPromise.fn || !cachedPromise.args) throw new Error("Cached promise was not registered");
  return cachedPromise.fn(...cachedPromise.args);
}

async function publishPageFromFetch() {
  const data = await runCachedPromise();
  cachedPromise.options?.onData?.(data);
}
