import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaginatedResult } from "../services";
import { usePaginatedResource } from "./usePaginatedResource";

const reactState = vi.hoisted(() => ({
  states: [] as unknown[],
  refs: [] as Array<{ current: unknown }>,
  stateIndex: 0,
  refIndex: 0,
}));

const cachedPromise = vi.hoisted(() => ({
  fn: undefined as
    | ((
        cacheKey: string,
        page: number,
        paramsKey: string,
      ) => Promise<{
        page: number;
        paramsKey: string;
        result: PaginatedResult<string>;
      }>)
    | undefined,
  args: undefined as readonly [string, number, string] | undefined,
  options: undefined as
    | {
        onData?: (data: { page: number; paramsKey: string; result: PaginatedResult<string> }) => void;
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

describe("usePaginatedResource", () => {
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

  it("fetches page data through the cached promise callback", async () => {
    const fetchPage = vi.fn(
      async ({
        filter,
        page,
        limit,
      }: {
        filter: string;
        page: number;
        limit: number;
      }): Promise<PaginatedResult<string>> => ({
        items: [`${filter}-${page}-${limit}`],
        hasMore: false,
      }),
    );

    renderPaginatedHook({ params: { filter: "open" }, fetchPage });

    expect(cachedPromise.args).toEqual(["issues", 1, '{"filter":"open"}']);
    await expect(runCachedPromise()).resolves.toEqual({
      page: 1,
      paramsKey: '{"filter":"open"}',
      result: { items: ["open-1-10"], hasMore: false },
    });
    expect(fetchPage).toHaveBeenCalledWith({ filter: "open", page: 1, limit: 10 });
  });

  it("replaces page 1 results and appends subsequent pages", async () => {
    let result = renderPaginatedHook({ params: { filter: "open" }, fetchPage: pageFetcher() });
    expect(result.items).toEqual([]);
    expect(cachedPromise.args).toEqual(["issues", 1, '{"filter":"open"}']);

    await publishPageFromFetch();
    result = renderPaginatedHook({ params: { filter: "open" }, fetchPage: pageFetcher() });
    expect(result.items).toEqual(["open-1"]);
    expect(result.pagination.hasMore).toBe(true);

    result.pagination.onLoadMore();
    result = renderPaginatedHook({ params: { filter: "open" }, fetchPage: pageFetcher() });
    expect(cachedPromise.args).toEqual(["issues", 2, '{"filter":"open"}']);

    await publishPageFromFetch();
    result = renderPaginatedHook({ params: { filter: "open" }, fetchPage: pageFetcher() });
    expect(result.items).toEqual(["open-1", "open-2"]);
    expect(result.pagination.hasMore).toBe(false);
  });

  it("skips duplicate keyed items when appending subsequent pages", async () => {
    let result = renderPaginatedHook({
      params: { filter: "open" },
      fetchPage: pageFetcher(),
      getItemKey: (item) => item,
    });

    publishPage({ page: 1, paramsKey: '{"filter":"open"}', items: ["issue-1", "issue-2"], hasMore: true });
    result = renderPaginatedHook({
      params: { filter: "open" },
      fetchPage: pageFetcher(),
      getItemKey: (item) => item,
    });
    expect(result.items).toEqual(["issue-1", "issue-2"]);

    result.pagination.onLoadMore();
    result = renderPaginatedHook({
      params: { filter: "open" },
      fetchPage: pageFetcher(),
      getItemKey: (item) => item,
    });
    expect(cachedPromise.args).toEqual(["issues", 2, '{"filter":"open"}']);

    publishPage({ page: 2, paramsKey: '{"filter":"open"}', items: ["issue-2", "issue-3"], hasMore: false });
    result = renderPaginatedHook({
      params: { filter: "open" },
      fetchPage: pageFetcher(),
      getItemKey: (item) => item,
    });
    expect(result.items).toEqual(["issue-1", "issue-2", "issue-3"]);
  });

  it("uses stable params keys independent of object key order", () => {
    renderPaginatedHook({
      params: { filter: "open", owner: "alice" },
      fetchPage: pageFetcher<{ filter: string; owner: string }>(),
    });
    const firstArgs = cachedPromise.args;

    renderPaginatedHook({
      params: { owner: "alice", filter: "open" },
      fetchPage: pageFetcher<{ owner: string; filter: string }>(),
    });
    expect(cachedPromise.args).toEqual(firstArgs);
  });

  it("resets visible items and page when params change", async () => {
    let result = renderPaginatedHook({ params: { filter: "open" }, fetchPage: pageFetcher() });
    await publishPageFromFetch();
    result = renderPaginatedHook({ params: { filter: "open" }, fetchPage: pageFetcher() });
    result.pagination.onLoadMore();

    result = renderPaginatedHook({ params: { filter: "closed" }, fetchPage: pageFetcher() });

    expect(result.items).toEqual([]);
    expect(result.pagination.hasMore).toBe(true);
    expect(cachedPromise.args).toEqual(["issues", 1, '{"filter":"closed"}']);
  });

  it("ignores stale page results from previous params", async () => {
    let result = renderPaginatedHook({ params: { filter: "open" }, fetchPage: pageFetcher() });
    await publishPageFromFetch();

    result = renderPaginatedHook({ params: { filter: "closed" }, fetchPage: pageFetcher() });

    publishPage({ page: 2, paramsKey: '{"filter":"open"}', items: ["stale"], hasMore: false });
    result = renderPaginatedHook({ params: { filter: "closed" }, fetchPage: pageFetcher() });
    expect(result.items).toEqual([]);

    await publishPageFromFetch();
    result = renderPaginatedHook({ params: { filter: "closed" }, fetchPage: pageFetcher() });
    expect(result.items).toEqual(["closed-1"]);
  });
});

type StringParams = Record<string, string>;

type RenderOptions<Params extends StringParams> = {
  params: Params;
  fetchPage: (params: Params & { page: number; limit: number }) => Promise<PaginatedResult<string>>;
  getItemKey?: (item: string) => string | number | undefined;
};

function renderPaginatedHook<Params extends StringParams>({ params, fetchPage, getItemKey }: RenderOptions<Params>) {
  reactState.stateIndex = 0;
  reactState.refIndex = 0;

  return usePaginatedResource({
    cacheKey: "issues",
    errorTitle: "Failed",
    pageSize: 10,
    params,
    fetchPage,
    getItemKey,
  });
}

function pageFetcher<Params extends StringParams = { filter: string }>() {
  return vi.fn(
    async ({
      filter,
      page,
    }: Params & { filter?: string; page: number; limit: number }): Promise<PaginatedResult<string>> => ({
      items: [`${filter}-${page}`],
      hasMore: page === 1,
    }),
  ) as unknown as (params: Params & { page: number; limit: number }) => Promise<PaginatedResult<string>>;
}

async function runCachedPromise() {
  if (!cachedPromise.fn || !cachedPromise.args) throw new Error("Cached promise was not registered");
  return cachedPromise.fn(...cachedPromise.args);
}

async function publishPageFromFetch() {
  const data = await runCachedPromise();
  cachedPromise.options?.onData?.(data);
}

function publishPage({
  page,
  paramsKey,
  items,
  hasMore,
}: {
  page: number;
  paramsKey: string;
  items: string[];
  hasMore: boolean;
}) {
  cachedPromise.options?.onData?.({
    page,
    paramsKey,
    result: { items, hasMore },
  });
}
