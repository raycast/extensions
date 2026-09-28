import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MissingPermissionError,
  RateLimitedError,
  ThreadsApiError,
  TokenExpiredError,
  getAccountInsights,
  getPostInsights,
  getPosts,
  getReplies,
  mapWithConcurrency,
} from "./threads-api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function mockFetch(handler: (url: URL) => Response | Promise<Response>) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = input instanceof URL ? input : new URL(typeof input === "string" ? input : input.url);
    return Promise.resolve(handler(url));
  });
}

/** One page of `count` posts, all in the future so no `since` cutoff trims them. */
function postPage(count: number, mediaType: string, after?: string) {
  return {
    data: Array.from({ length: count }, (_, i) => ({
      id: `${mediaType}-${i}`,
      text: "post",
      timestamp: "2026-09-10T00:00:00+0000",
      media_type: mediaType,
      permalink: `p${i}`,
    })),
    ...(after ? { paging: { cursors: { after }, next: "https://next" } } : {}),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("error classification", () => {
  it("turns Meta code 190 into TokenExpiredError", async () => {
    mockFetch(() => jsonResponse({ error: { message: "Error validating access token", code: 190 } }, 400));
    await expect(getPosts("t", { maxPosts: 10 })).rejects.toBeInstanceOf(TokenExpiredError);
  });

  it("turns a throttling code or a 429 into RateLimitedError", async () => {
    mockFetch(() => jsonResponse({ error: { message: "Application request limit reached", code: 4 } }, 400));
    await expect(getPosts("t", { maxPosts: 10 })).rejects.toBeInstanceOf(RateLimitedError);

    vi.restoreAllMocks();
    mockFetch(() => jsonResponse({ error: { message: "slow down" } }, 429));
    await expect(getPosts("t", { maxPosts: 10 })).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("names the scope a permission error is missing, per endpoint", async () => {
    mockFetch(() => jsonResponse({ error: { message: "(#10) no permission", code: 10 } }, 403));
    const replies = await getReplies("t", "123").catch((e) => e);
    expect(replies).toBeInstanceOf(MissingPermissionError);
    expect(replies.scope).toBe("threads_read_replies");

    vi.restoreAllMocks();
    mockFetch(() => jsonResponse({ error: { message: "(#200) no permission", code: 200 } }, 403));
    const insights = await getAccountInsights("t", new Date(), new Date()).catch((e) => e);
    expect(insights).toBeInstanceOf(MissingPermissionError);
    expect(insights.scope).toBe("threads_manage_insights");
  });

  it("keeps a non-JSON error body instead of reporting only the status", async () => {
    mockFetch(() => new Response("<html>502 Bad Gateway</html>", { status: 502 }));
    const error = await getPosts("t", { maxPosts: 10 }).catch((e) => e);
    expect(error).toBeInstanceOf(ThreadsApiError);
    expect(error.message).toContain("502 Bad Gateway");
    expect(error).toMatchObject({ status: 502, path: "/me/threads" });
  });

  it("sends the token as a bearer header, never in the query string", async () => {
    const spy = mockFetch(() => jsonResponse({ data: [] }));
    await getPosts("secret-token", { maxPosts: 10 });
    const [url, init] = spy.mock.calls[0];
    expect(String(url)).not.toContain("secret-token");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer secret-token");
  });
});

describe("getPosts", () => {
  it("always requests a full page, so dropped reposts can't stall the paging", async () => {
    const spy = mockFetch((url) =>
      jsonResponse(url.searchParams.get("after") ? postPage(5, "TEXT") : postPage(100, "REPOST_FACADE", "page2")),
    );

    const { posts } = await getPosts("t", { maxPosts: 5 });
    expect(posts).toHaveLength(5);
    // Sizing the request to the shortfall would have asked for 5 at a time and paged
    // once per repost-only page.
    for (const [url] of spy.mock.calls) expect(new URL(String(url)).searchParams.get("limit")).toBe("100");
    expect(spy.mock.calls).toHaveLength(2);
  });

  it("drops reposts and posts without a timestamp", async () => {
    mockFetch(() =>
      jsonResponse({
        data: [
          { id: "1", text: "new", timestamp: "2026-09-10T00:00:00+0000", media_type: "TEXT", permalink: "p1" },
          { id: "2", timestamp: "2026-09-09T00:00:00+0000", media_type: "REPOST_FACADE" },
          { id: "3", text: "no timestamp", media_type: "TEXT" },
        ],
      }),
    );
    const { posts, truncated } = await getPosts("t", { maxPosts: 100 });
    expect(posts.map((p) => p.id)).toEqual(["1"]);
    expect(truncated).toBe(false);
  });

  it("does not claim truncation when the history ends exactly on the cap", async () => {
    mockFetch(() => jsonResponse(postPage(2, "TEXT")));
    const { posts, truncated } = await getPosts("t", { maxPosts: 2 });
    expect(posts).toHaveLength(2);
    expect(truncated).toBe(false);
  });

  it("flags truncation when a page holds more than the cap", async () => {
    mockFetch(() => jsonResponse(postPage(10, "TEXT", "more")));
    const { posts, truncated } = await getPosts("t", { maxPosts: 3 });
    expect(posts).toHaveLength(3);
    expect(truncated).toBe(true);
  });
});

describe("insights parsing", () => {
  it("reads total_value and sums daily values for post insights", async () => {
    mockFetch(() =>
      jsonResponse({
        data: [
          { name: "views", values: [{ value: 10 }, { value: 5 }] },
          { name: "likes", total_value: { value: 7 } },
          { name: "shares", total_value: { value: 1 } },
        ],
      }),
    );
    expect(await getPostInsights("t", "1")).toEqual({
      views: 15,
      likes: 7,
      replies: 0,
      reposts: 0,
      quotes: 0,
      shares: 1,
    });
  });

  it("returns null for a post the API refuses insights on", async () => {
    mockFetch(() => jsonResponse({ error: { message: "no insights for this media", code: 100 } }, 400));
    expect(await getPostInsights("t", "1")).toBeNull();
  });

  it("rethrows a systemic failure rather than reporting it as a post without insights", async () => {
    for (const body of [
      { message: "expired", code: 190 },
      { message: "limit reached", code: 4 },
      { message: "(#10) no permission", code: 10 },
    ]) {
      vi.restoreAllMocks();
      mockFetch(() => jsonResponse({ error: body }, 400));
      await expect(getPostInsights("t", "1")).rejects.toThrow();
    }
  });

  it("rethrows a server error, a network failure, or a timeout instead of returning null", async () => {
    mockFetch(() => jsonResponse({ error: { message: "Service temporarily unavailable", code: 2 } }, 503));
    await expect(getPostInsights("t", "1")).rejects.toBeInstanceOf(ThreadsApiError);

    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    await expect(getPostInsights("t", "1")).rejects.toThrow("fetch failed");

    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError"));
    await expect(getPostInsights("t", "1")).rejects.toThrow("timed out");
  });

  it("rethrows a transient error sent as HTTP 400 instead of returning null", async () => {
    for (const body of [
      { message: "Service temporarily unavailable", code: 2 },
      { message: "An unknown error occurred", code: 1, is_transient: true },
      { message: "Please retry your request later.", code: 100, is_transient: true },
    ]) {
      vi.restoreAllMocks();
      mockFetch(() => jsonResponse({ error: body }, 400));
      await expect(getPostInsights("t", "1")).rejects.toMatchObject({ transient: true, status: 400 });
    }
  });

  it("treats a code 1 not flagged transient as that one post's refusal", async () => {
    // Some objects answer code 1 on every request. Reading that as transient failed the
    // whole post list on every launch instead of blanking one row.
    mockFetch(() => jsonResponse({ error: { message: "An unknown error occurred", code: 1 } }, 400));
    expect(await getPostInsights("t", "1")).toBeNull();
  });

  it("rethrows a network failure from the follower count instead of reporting null followers", async () => {
    mockFetch((url) => {
      if (url.searchParams.get("metric") === "followers_count") throw new TypeError("fetch failed");
      return jsonResponse({ data: [{ name: "views", total_value: { value: 42 } }] });
    });
    await expect(getAccountInsights("t", new Date(), new Date())).rejects.toThrow("fetch failed");
  });

  it("fetches follower count separately and clamps since to the API's earliest date", async () => {
    const calls: URL[] = [];
    mockFetch((url) => {
      calls.push(url);
      if (url.searchParams.get("metric") === "followers_count") {
        return jsonResponse({ data: [{ name: "followers_count", total_value: { value: 1234 } }] });
      }
      return jsonResponse({
        data: [
          {
            name: "views",
            values: [
              { value: 3, end_time: "2026-09-01T07:00:00+0000" },
              { value: 4, end_time: "2026-09-02T07:00:00+0000" },
            ],
          },
          { name: "likes", total_value: { value: 9 } },
        ],
      });
    });

    const result = await getAccountInsights("t", new Date("2020-01-01T00:00:00Z"), new Date("2026-09-03T00:00:00Z"));
    expect(result).toMatchObject({ followersCount: 1234, views: 7, likes: 9, replies: 0 });
    expect(result.viewsByDay).toEqual([
      { endTime: "2026-09-01T07:00:00+0000", value: 3 },
      { endTime: "2026-09-02T07:00:00+0000", value: 4 },
    ]);

    const periodCall = calls.find((url) => url.searchParams.get("metric")?.startsWith("views"));
    expect(periodCall?.searchParams.get("since")).toBe("1712991600");
    expect(calls.find((url) => url.searchParams.get("metric") === "followers_count")?.searchParams.has("since")).toBe(
      false,
    );
  });

  it("keeps the period metrics when only the follower count fails", async () => {
    mockFetch((url) =>
      url.searchParams.get("metric") === "followers_count"
        ? jsonResponse({ error: { message: "not enough followers", code: 100 } }, 400)
        : jsonResponse({ data: [{ name: "views", total_value: { value: 42 } }] }),
    );
    const result = await getAccountInsights("t", new Date("2026-09-01T00:00:00Z"), new Date("2026-09-08T00:00:00Z"));
    expect(result).toMatchObject({ followersCount: null, views: 42 });
  });
});

describe("getReplies", () => {
  it("reports how many replies were dropped for having no username", async () => {
    mockFetch((url) =>
      url.searchParams.get("after") === "p2"
        ? jsonResponse({ data: [{ id: "3", username: "cat", timestamp: "2026-09-02T00:00:00+0000" }] })
        : jsonResponse({
            data: [
              { id: "1", username: "amy", text: "hi", timestamp: "2026-09-01T00:00:00+0000", permalink: "l1" },
              { id: "2", text: "private profile", timestamp: "2026-09-01T00:00:00+0000" },
            ],
            paging: { cursors: { after: "p2" }, next: "https://next" },
          }),
    );
    const { replies, truncated, dropped } = await getReplies("t", "post");
    expect(replies.map((r) => r.username)).toEqual(["amy", "cat"]);
    expect(replies[1].text).toBe("");
    expect({ truncated, dropped }).toEqual({ truncated: false, dropped: 1 });
  });

  it("excludes replies the host hid or whose author they blocked, and counts them", async () => {
    const spy = mockFetch(() =>
      jsonResponse({
        data: ["NOT_HUSHED", "UNHUSHED", "HIDDEN", "COVERED", "BLOCKED", "RESTRICTED", undefined].map(
          (hideStatus, i) => ({
            id: String(i),
            username: `user${i}`,
            timestamp: "2026-09-01T00:00:00+0000",
            ...(hideStatus ? { hide_status: hideStatus } : {}),
          }),
        ),
      }),
    );
    const { replies, hidden, dropped } = await getReplies("t", "post");
    expect(replies.map((r) => r.username)).toEqual(["user0", "user1", "user6"]);
    expect({ hidden, dropped }).toEqual({ hidden: 4, dropped: 0 });
    expect(new URL(String(spy.mock.calls[0][0])).searchParams.get("fields")).toContain("hide_status");
  });
});

describe("mapWithConcurrency", () => {
  it("preserves order and never exceeds the limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const results = await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5 * (7 - n)));
      inFlight--;
      return n * 10;
    });
    expect(results).toEqual([10, 20, 30, 40, 50, 60]);
    expect(peak).toBe(2);
  });

  it("stops handing out work once one item fails", async () => {
    const seen: number[] = [];
    const items = Array.from({ length: 30 }, (_, i) => i);
    const run = mapWithConcurrency(items, 2, async (item) => {
      seen.push(item);
      await new Promise((resolve) => setTimeout(resolve, 1));
      if (item === 1) throw new Error("rate limited");
      return item;
    });

    await expect(run).rejects.toThrow("rate limited");
    // The sibling worker is still mid-item when the rejection surfaces. Give it the
    // time to keep going that the early stop is supposed to deny it: without the
    // stop it drains all 30, spending the rest of the API quota on the same error.
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(seen.length).toBeLessThan(items.length);
  });
});
