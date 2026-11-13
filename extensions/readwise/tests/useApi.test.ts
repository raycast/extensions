import { useState } from "react";
import useSWR from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDetailApi, useListApi } from "../src/api/useApi";
import { useHandleError } from "../src/api/useHandleError";

vi.mock("@raycast/api", () => ({ getPreferenceValues: () => ({ token: "test-token", pageSize: 500 }) }));
vi.mock("react", () => ({ useState: vi.fn() }));
vi.mock("swr", () => ({ default: vi.fn() }));
vi.mock("../src/api/useHandleError", () => ({ useHandleError: vi.fn() }));

const mockedFetch = vi.fn<typeof fetch>();
const setParams = vi.fn();
const mockedSWR = vi.mocked(useSWR);

beforeEach(() => {
  vi.stubGlobal("fetch", mockedFetch);
  vi.mocked(useState).mockImplementation(((initial: unknown) => [initial, setParams]) as unknown as typeof useState);
  mockedSWR.mockReturnValue({ data: undefined, error: undefined, isValidating: false } as ReturnType<typeof useSWR>);
});
afterEach(() => vi.unstubAllGlobals());

// Exercise the registered fetcher with the key SWR receives, including its tuple convention.
async function runFetcher() {
  const [key, fetcher] = mockedSWR.mock.calls[0];
  return (fetcher as (key: unknown) => Promise<unknown>)(key);
}

describe("API hook contracts", () => {
  it("registers a detail key and fetches that endpoint", async () => {
    const data = { id: 42, title: "Deep Work" };
    mockedFetch.mockResolvedValueOnce(new Response(JSON.stringify(data)));
    expect(useDetailApi("/v2/books/42").loading).toBe(true);
    expect(mockedSWR.mock.calls[0][0]).toBe("/v2/books/42");
    await expect(runFetcher()).resolves.toEqual(data);
    expect(mockedFetch).toHaveBeenCalledWith("https://readwise.io/api/v2/books/42?", expect.any(Object));
  });

  it("uses the preferred page size for a default list request", async () => {
    mockedFetch.mockResolvedValueOnce(new Response("{}"));
    const result = useListApi("/v2/books");
    expect(result.currentParams).toEqual({ page_size: 500 });
    expect(result.setParams).toBe(setParams);
    expect(mockedSWR.mock.calls[0][0]).toEqual(["/v2/books", { page_size: 500 }]);
    await runFetcher();
    expect(mockedFetch).toHaveBeenCalledWith("https://readwise.io/api/v2/books?page_size=500", expect.any(Object));
  });

  it("passes explicit filters through the SWR tuple to the HTTP request", async () => {
    const params = { page_size: 10, page: 2, book_id: 42 };
    mockedFetch.mockResolvedValueOnce(new Response("{}"));
    expect(useListApi("/v2/highlights", params).defaultParams).toEqual(params);
    await runFetcher();
    expect(mockedFetch).toHaveBeenCalledWith(
      "https://readwise.io/api/v2/highlights?book_id=42&page=2&page_size=10", expect.any(Object)
    );
  });

  it("uses updated state in the list cache key and request", async () => {
    vi.mocked(useState).mockReturnValue([{ page_size: 10, page: 3 }, setParams]);
    mockedFetch.mockResolvedValueOnce(new Response("{}"));
    const result = useListApi("/v2/books", { page_size: 10, page: 1 });
    expect(result.currentParams).toEqual({ page_size: 10, page: 3 });
    expect(result.defaultParams).toEqual({ page_size: 10, page: 1 });
    await runFetcher();
    expect(mockedFetch).toHaveBeenCalledWith("https://readwise.io/api/v2/books?page=3&page_size=10", expect.any(Object));
  });

  it.each([(endpoint: string) => useDetailApi(endpoint), (endpoint: string) => useListApi(endpoint)])("forwards errors and stops the initial loading state", (hook) => {
    const error = Object.assign(new Error("Unauthorized"), { status: 401 });
    mockedSWR.mockReturnValue({ data: undefined, error, isValidating: false } as ReturnType<typeof useSWR>);
    expect(hook("/v2/books").loading).toBe(false);
    expect(useHandleError).toHaveBeenCalledWith(error);
  });

  it.each([(endpoint: string) => useDetailApi(endpoint), (endpoint: string) => useListApi(endpoint)])("reports background revalidation while keeping cached data", (hook) => {
    const data = { id: 42 };
    mockedSWR.mockReturnValue({ data, error: undefined, isValidating: true } as ReturnType<typeof useSWR>);
    expect(hook("/v2/books")).toMatchObject({ data, loading: true });
  });
});
