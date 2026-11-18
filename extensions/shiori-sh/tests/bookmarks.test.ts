import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLink, fetchLinks, normalizeUrl } from "../src/api";
import { fetchLinksPage } from "../src/links-page";
import saveBookmark, { confirmation } from "../src/tools/save-bookmark";
import searchBookmarks from "../src/tools/search-bookmarks";
import findUnread from "../src/tools/find-unread-bookmarks";

vi.mock("@raycast/api", () => ({ getPreferenceValues: () => ({ apiKey: "shk_test_only" }) }));
const fetchMock = vi.fn<typeof fetch>();
const link = (id: number) => ({
  id: String(id),
  url: `https://example.com/${id}`,
  title: `Article ${id}`,
  summary: null,
  read_at: null,
  created_at: "2026-10-01T00:00:00Z",
});
const reply = (value: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(value), { status }));
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("paginated search", () => {
  it("continues beyond 100 results and stops at the reported total", async () => {
    reply({ success: true, links: Array.from({ length: 100 }, (_, i) => link(i)), total: 102 });
    const first = await searchBookmarks({ query: "design", read: "unread" });
    expect(first).toMatchObject({ hasMore: true, nextOffset: 100, total: 102 });
    reply({ success: true, links: [link(100), link(101)], total: 102 });
    const last = await searchBookmarks({ query: "design", read: "unread", offset: first.nextOffset! });
    expect(last).toMatchObject({ hasMore: false, nextOffset: null, offset: 100 });
    expect(String(fetchMock.mock.calls[1][0])).toContain("offset=100");
    expect(JSON.stringify(last)).not.toContain("shk_test_only");
  });
  it("advances by the actual length of a short intermediate page", async () => {
    reply({ success: true, links: [link(1), link(2)], total: 7 });
    expect(await fetchLinksPage({ limit: 5, offset: 0 })).toMatchObject({ hasMore: true, nextOffset: 2 });
  });
  it("handles empty results and an offset beyond a shrinking library", async () => {
    reply({ success: true, links: [], total: 0 });
    expect(await fetchLinksPage()).toMatchObject({ links: [], hasMore: false, nextOffset: null });
    reply({ success: true, links: [], total: 5 });
    expect(await fetchLinksPage({ offset: 100 })).toMatchObject({ hasMore: false, nextOffset: null });
  });
  it("reports an inconsistent empty page instead of looping or claiming completeness", async () => {
    reply({ success: true, links: [], total: 10 });
    await expect(fetchLinksPage()).rejects.toThrow("empty page");
  });
  it.each([{ limit: 0 }, { limit: 101 }, { limit: 1.5 }, { offset: -1 }, { offset: Infinity }])(
    "rejects invalid pagination %j before networking",
    async (params) => {
      await expect(fetchLinksPage(params)).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it("encodes documented filters and forces unread topic search", async () => {
    reply({ success: true, links: [], total: 0 });
    await findUnread({
      topic: "  design & systems  ",
      favorite: true,
      tag: "a/b",
      since: "7d",
      sort: "oldest",
      limit: 20,
      offset: 40,
    });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(Object.fromEntries(url.searchParams)).toEqual({
      search: "design & systems",
      read: "unread",
      favorite: "true",
      tag: "a/b",
      since: "7d",
      sort: "oldest",
      limit: "20",
      offset: "40",
    });
    expect(fetchMock.mock.calls[0][1]?.method).toBeUndefined();
  });
  it("rejects a blank topic without reading or writing", async () => {
    await expect(findUnread({ topic: " " })).rejects.toThrow("topic");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("saving bookmarks", () => {
  it.each([
    ["example.com:8080/article", "https://example.com:8080/article"],
    ["localhost:3000", "https://localhost:3000/"],
    ["[::1]:8080/article", "https://[::1]:8080/article"],
    ["HTTPS://example.com/article", "https://example.com/article"],
  ])("normalizes valid URLs without losing host ports: %s", (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });

  it("shows the normalized URL, title, status, and duplicate side effect without a request", async () => {
    expect(await confirmation({ url: " example.com/article ", title: " A title ", read: true })).toEqual({
      message: expect.stringContaining("bumped"),
      info: [
        { name: "URL", value: "https://example.com/article" },
        { name: "Title", value: "A title" },
        { name: "Save as", value: "Read" },
      ],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([false, true])("accepts the documented minimal save response; duplicate=%s", async (duplicate) => {
    reply({ success: true, linkId: "saved-id", duplicate });
    expect(await saveBookmark({ url: "example.com/article", title: " Title ", read: false })).toMatchObject({
      id: "saved-id",
      duplicate,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1]!;
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer shk_test_only" });
    expect(JSON.parse(String(init.body))).toEqual({ url: "https://example.com/article", title: "Title", read: false });
  });
  it("does not report success without the server's link ID", async () => {
    reply({ success: true });
    await expect(createLink("example.com")).rejects.toThrow("Check your library");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([
    "",
    "file:///tmp/secret",
    "javascript:alert(1)",
    "https://name:password@example.com",
    "https://",
    "not a url",
  ])("rejects unsafe or invalid URL %s", async (url) => {
    expect(() => normalizeUrl(url)).toThrow();
    await expect(saveBookmark({ url })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("request failures", () => {
  it.each([401, 403, 429, 500])("reports status %s without echoing error bodies or retrying", async (status) => {
    reply({ success: false, error: "private shk_test_only" }, status);
    await expect(fetchLinks()).rejects.toThrow(status === 429 ? "rate limit" : status < 429 ? "authentication" : "500");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([
    null,
    { success: false, error: "shk_test_only" },
    { success: true, links: null, total: 1 },
    { success: true, links: [], total: -1 },
    { success: true, links: [null], total: 1 },
  ])("rejects malformed response %j", async (value) => {
    reply(value);
    await expect(fetchLinks()).rejects.toThrow(/Shiori/);
  });
  it("handles non-JSON success and network errors without leaking details", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>shk_test_only</html>"));
    await expect(fetchLinks()).rejects.toThrow("invalid response");
    fetchMock.mockRejectedValueOnce(new Error("private shk_test_only"));
    await expect(fetchLinks()).rejects.toThrow("Could not connect to Shiori");
  });
  it("forwards cancellation and discards a response after cancellation", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce(async (_url, init) => {
      controller.abort();
      expect(init?.signal?.aborted).toBe(true);
      return new Response(JSON.stringify({ success: true, links: [link(1)], total: 1 }));
    });
    await expect(fetchLinksPage({}, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });
  it("bounds a stalled request and does not retry a mutation", async () => {
    const timeout = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeout.signal);
    fetchMock.mockImplementationOnce(async () => {
      timeout.abort();
      throw new DOMException("Timed out", "TimeoutError");
    });
    await expect(createLink("https://example.com")).rejects.toThrow("Check your library before retrying");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
