import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMemoFilter, createMemo, listMemos, updateMemo } from "../../src/api/memo";

const connection = { instanceUrl: "https://memos.example.com", accessToken: "test-token" };
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const rawMemo = {
  name: "memos/abc",
  creator: "users/7",
  content: "# Hello\nworld",
  visibility: "PRIVATE",
  createTime: "2026-09-01T10:00:00Z",
  updateTime: "2026-09-02T10:00:00Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildMemoFilter", () => {
  it("returns undefined when there is nothing to filter", () => {
    expect(buildMemoFilter({ searchText: "  " })).toBeUndefined();
  });

  it("matches content and escapes quotes and backslashes", () => {
    expect(buildMemoFilter({ searchText: 'say "hi" \\o/' })).toBe('content.contains("say \\"hi\\" \\\\o/")');
  });

  it("combines the creator and content conditions", () => {
    expect(buildMemoFilter({ searchText: "todo", creator: "users/7" })).toBe(
      'creator == "users/7" && content.contains("todo")',
    );
  });
});

describe("listMemos", () => {
  it("requests memos with the filter and page token and fills defaults", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ memos: [rawMemo], nextPageToken: "next" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await listMemos(connection, { filter: 'content.contains("x")', pageToken: "p2", pageSize: 20 });

    const url = new URL(fetchMock.mock.calls[0]?.[0] as string);
    expect(url.pathname).toBe("/api/v1/memos");
    expect(url.searchParams.get("filter")).toBe('content.contains("x")');
    expect(url.searchParams.get("pageToken")).toBe("p2");
    expect(url.searchParams.get("pageSize")).toBe("20");
    expect(result.nextPageToken).toBe("next");
    expect(result.memos[0]).toMatchObject({ name: "memos/abc", creator: "users/7", pinned: false, tags: [] });
  });

  it("treats an empty next page token as the last page", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ memos: [], nextPageToken: "" })));
    await expect(listMemos(connection, {})).resolves.toEqual({ memos: [], nextPageToken: undefined });
  });
});

describe("createMemo", () => {
  it("posts the content and visibility as JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(rawMemo));
    vi.stubGlobal("fetch", fetchMock);

    await createMemo(connection, { content: "hello", visibility: "PRIVATE" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://memos.example.com/api/v1/memos");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ content: "hello", visibility: "PRIVATE" });
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
  });
});

describe("updateMemo", () => {
  it("patches content and visibility with an update mask", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ...rawMemo, content: "edited" }));
    vi.stubGlobal("fetch", fetchMock);

    const memo = await updateMemo(connection, "memos/abc", { content: "edited", visibility: "PUBLIC" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/api/v1/memos/abc");
    expect(parsed.searchParams.get("updateMask")).toBe("content,visibility");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ content: "edited", visibility: "PUBLIC" });
    expect(memo.content).toBe("edited");
  });
});
