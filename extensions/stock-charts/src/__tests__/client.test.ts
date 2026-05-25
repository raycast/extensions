import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocalStorage } from "@raycast/api";
import { get, YahooFinanceError } from "../yahoo-finance/client";

const COOKIE_CRUMB_KEY = "yahoo-cookie-crumb";

function mockFetchSequence(responses: Array<Record<string, unknown>>) {
  const fetchMock = vi.fn();
  for (const res of responses) {
    fetchMock.mockResolvedValueOnce({
      ok: res.ok ?? true,
      status: res.status ?? 200,
      headers: new Headers(res.headers as Record<string, string> | undefined),
      json: res.json ?? (() => Promise.resolve({})),
      text: res.text ?? (() => Promise.resolve("")),
    });
  }
  return fetchMock;
}

function cookieResponse() {
  return {
    ok: false,
    status: 302,
    headers: { "set-cookie": "A3=abc123; path=/; domain=.yahoo.com" },
  };
}

function crumbResponse(crumb = "testCrumb42") {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(crumb),
  };
}

function apiResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  };
}

function errorResponse(status: number) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({}),
  };
}

describe("Yahoo Finance client — get()", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(LocalStorage.getItem).mockResolvedValue(undefined);
    vi.mocked(LocalStorage.setItem).mockResolvedValue(undefined);
  });

  it("fetches cookie/crumb then makes API request", async () => {
    const data = { chart: { result: [] } };
    const fetchMock = mockFetchSequence([
      cookieResponse(),
      crumbResponse(),
      apiResponse(data),
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const result = await get("/v8/finance/chart/AAPL", { range: "1d" });

    expect(result).toEqual(data);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe("https://fc.yahoo.com");
    expect(fetchMock.mock.calls[1][0]).toContain("/v1/test/getcrumb");
    expect(fetchMock.mock.calls[2][0]).toContain("/v8/finance/chart/AAPL");
    expect(fetchMock.mock.calls[2][0]).toContain("crumb=testCrumb42");
    expect(fetchMock.mock.calls[2][0]).toContain("range=1d");
  });

  it("uses cached cookie/crumb when fresh", async () => {
    const cached = JSON.stringify({
      cookie: "cachedCookie",
      crumb: "cachedCrumb",
      fetchedAt: Date.now() - 1000,
    });
    vi.mocked(LocalStorage.getItem).mockResolvedValue(cached);

    const data = { result: "ok" };
    const fetchMock = mockFetchSequence([apiResponse(data)]);
    vi.stubGlobal("fetch", fetchMock);

    const result = await get("/v8/finance/chart/AAPL");

    expect(result).toEqual(data);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("crumb=cachedCrumb");
  });

  it("refreshes cookie/crumb when cache is expired", async () => {
    const expired = JSON.stringify({
      cookie: "oldCookie",
      crumb: "oldCrumb",
      fetchedAt: Date.now() - 13 * 60 * 60 * 1000,
    });
    vi.mocked(LocalStorage.getItem).mockResolvedValue(expired);

    const data = { result: "fresh" };
    const fetchMock = mockFetchSequence([
      cookieResponse(),
      crumbResponse("freshCrumb"),
      apiResponse(data),
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const result = await get("/test");

    expect(result).toEqual(data);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toContain("crumb=freshCrumb");
  });

  it("retries on 401 with refreshed credentials", async () => {
    const cached = JSON.stringify({
      cookie: "staleCookie",
      crumb: "staleCrumb",
      fetchedAt: Date.now() - 1000,
    });
    vi.mocked(LocalStorage.getItem).mockResolvedValue(cached);

    const data = { retried: true };
    const fetchMock = mockFetchSequence([
      errorResponse(401),
      cookieResponse(),
      crumbResponse("newCrumb"),
      apiResponse(data),
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const result = await get("/test");

    expect(result).toEqual(data);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("retries on 403 with refreshed credentials", async () => {
    const cached = JSON.stringify({
      cookie: "staleCookie",
      crumb: "staleCrumb",
      fetchedAt: Date.now() - 1000,
    });
    vi.mocked(LocalStorage.getItem).mockResolvedValue(cached);

    const data = { retried: true };
    const fetchMock = mockFetchSequence([
      errorResponse(403),
      cookieResponse(),
      crumbResponse("newCrumb"),
      apiResponse(data),
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const result = await get("/test");

    expect(result).toEqual(data);
  });

  it("throws immediately for non-auth errors (e.g. 404)", async () => {
    const cached = JSON.stringify({
      cookie: "cookie",
      crumb: "crumb",
      fetchedAt: Date.now() - 1000,
    });
    vi.mocked(LocalStorage.getItem).mockResolvedValue(cached);

    const fetchMock = mockFetchSequence([errorResponse(404)]);
    vi.stubGlobal("fetch", fetchMock);

    await expect(get("/test")).rejects.toThrow(/404/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("forwards AbortSignal to the API fetch", async () => {
    const cached = JSON.stringify({
      cookie: "cookie",
      crumb: "crumb",
      fetchedAt: Date.now() - 1000,
    });
    vi.mocked(LocalStorage.getItem).mockResolvedValue(cached);

    const data = { ok: true };
    const fetchMock = mockFetchSequence([apiResponse(data)]);
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    await get("/test", {}, controller.signal);

    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  });

  it("stores refreshed cookie/crumb in LocalStorage", async () => {
    const fetchMock = mockFetchSequence([
      cookieResponse(),
      crumbResponse("storedCrumb"),
      apiResponse({}),
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await get("/test");

    expect(LocalStorage.setItem).toHaveBeenCalledWith(
      COOKIE_CRUMB_KEY,
      expect.stringContaining("storedCrumb"),
    );
  });

  it("throws when no Set-Cookie header from Yahoo", async () => {
    const fetchMock = mockFetchSequence([
      { ok: false, status: 302 },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await expect(get("/test")).rejects.toThrow("No Set-Cookie header");
  });

  it("throws when crumb response is HTML", async () => {
    const fetchMock = mockFetchSequence([
      cookieResponse(),
      { ok: true, status: 200, text: () => Promise.resolve("<html>error</html>") },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await expect(get("/test")).rejects.toThrow("Invalid crumb response");
  });
});
