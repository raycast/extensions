import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchReadwise } from "../src/api";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({ token: "test-token", pageSize: 500 }),
}));

const mockedFetch = vi.fn<typeof fetch>();
beforeEach(() => vi.stubGlobal("fetch", mockedFetch));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fetchReadwise", () => {
  it("sends an authenticated request with pagination and returns the parsed response", async () => {
    const data = { count: 1, next: null, previous: null, results: [{ id: 42, title: "Deep Work" }] };
    mockedFetch.mockResolvedValueOnce(new Response(JSON.stringify(data)));

    await expect(fetchReadwise("/v2/books", { page: 2, page_size: 500 })).resolves.toEqual(data);
    expect(mockedFetch).toHaveBeenCalledExactlyOnceWith("https://readwise.io/api/v2/books?page=2&page_size=500", {
      method: "get",
      headers: { Authorization: "Token test-token" },
    });
  });

  it("encodes special characters and omits undefined query parameters", async () => {
    mockedFetch.mockResolvedValueOnce(new Response("{}"));

    await fetchReadwise("/v2/highlights", { search: "focus & café", book_id: undefined });

    expect(mockedFetch).toHaveBeenCalledWith(
      "https://readwise.io/api/v2/highlights?search=focus%20%26%20caf%C3%A9",
      expect.any(Object)
    );
  });

  it("supports an empty query for a detail request", async () => {
    const data = { id: 42, title: "Deep Work" };
    mockedFetch.mockResolvedValueOnce(new Response(JSON.stringify(data)));

    await expect(fetchReadwise("/v2/books/42", {})).resolves.toEqual(data);
    expect(mockedFetch).toHaveBeenCalledWith("https://readwise.io/api/v2/books/42?", expect.any(Object));
  });

  it.each([401, 403, 500])("includes HTTP status %i in the thrown error", async (status) => {
    mockedFetch.mockResolvedValueOnce(new Response('{"detail":"Request failed"}', { status }));

    await expect(fetchReadwise("/v2/books", {})).rejects.toMatchObject({
      message: "An error occurred while fetching the data.",
      status,
    });
  });

  it("waits for Retry-After before retrying a rate-limited request with the same parameters", async () => {
    vi.useFakeTimers();
    const data = { results: [{ id: 42 }] };
    mockedFetch
      .mockResolvedValueOnce(new Response("Rate limited", { status: 429, headers: { "Retry-After": "2" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(data)));

    const request = fetchReadwise("/v2/books", { page: 5, category: "books" });
    const result = expect(request).resolves.toEqual(data);
    await vi.advanceTimersByTimeAsync(1999);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await result;
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(mockedFetch.mock.calls[1]).toEqual(mockedFetch.mock.calls[0]);
  });

  it.each([undefined, "invalid", "-1"])("uses a three-second fallback for Retry-After %s", async (retryAfter) => {
    vi.useFakeTimers();
    mockedFetch
      .mockResolvedValueOnce(new Response("", { status: 429, headers: retryAfter ? { "Retry-After": retryAfter } : {} }))
      .mockResolvedValueOnce(new Response("{}"));

    const result = expect(fetchReadwise("/v2/highlights", {})).resolves.toEqual({});
    await vi.advanceTimersByTimeAsync(2999);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await result;
  });

  it("stops after two retries and returns an actionable rate-limit error", async () => {
    vi.useFakeTimers();
    mockedFetch.mockImplementation(async () => new Response("", { status: 429, headers: { "Retry-After": "1" } }));

    const result = expect(fetchReadwise("/v2/books", {})).rejects.toMatchObject({
      status: 429,
      message: "Readwise rate limit reached. Please try again in 1 second.",
    });
    await vi.runAllTimersAsync();
    await result;
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });

  it("does not retry sooner than a Retry-After exceeding the wait budget", async () => {
    mockedFetch.mockResolvedValueOnce(new Response("", { status: 429, headers: { "Retry-After": "120" } }));

    await expect(fetchReadwise("/v2/books", {})).rejects.toMatchObject({
      status: 429,
      message: "Readwise rate limit reached. Please try again in 120 seconds.",
    });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it("limits the total retry wait to sixty seconds", async () => {
    vi.useFakeTimers();
    mockedFetch.mockImplementation(async () => new Response("", { status: 429, headers: { "Retry-After": "40" } }));

    const result = expect(fetchReadwise("/v2/books", {})).rejects.toMatchObject({ status: 429 });
    await vi.runAllTimersAsync();
    await result;
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("propagates network failures", async () => {
    const error = new Error("Connection refused");
    mockedFetch.mockRejectedValueOnce(error);

    await expect(fetchReadwise("/v2/books", {})).rejects.toBe(error);
  });

  it("rejects responses with invalid JSON", async () => {
    mockedFetch.mockResolvedValueOnce(new Response("not JSON"));

    await expect(fetchReadwise("/v2/books", {})).rejects.toBeInstanceOf(SyntaxError);
  });
});
