import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetLocalStorage } from "./__mocks__/raycast-api";

const USERINFO_URL = "https://mcp.auth.mail.superhuman.com/oauth2/userinfo";

vi.mock("../src/lib/auth", () => ({
  getAccessToken: vi.fn(async () => "test-access-token"),
  getUserInfoEndpoint: vi.fn(async () => USERINFO_URL),
}));

beforeEach(() => {
  __resetLocalStorage();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => handler(String(url), init)));
}

describe("threadUrl", () => {
  it("URL-encodes the email", async () => {
    const { threadUrl } = await import("../src/lib/user");
    expect(threadUrl("andrew@hill.com", "19e323f543459abf")).toBe(
      "https://mail.superhuman.com/andrew%40hill.com/thread/19e323f543459abf#app",
    );
  });
});

describe("getUserEmail", () => {
  it("fetches from userinfo on cache miss and caches", async () => {
    let calls = 0;
    mockFetch(() => {
      calls++;
      return new Response(JSON.stringify({ email: "andrew@hill.com", email_verified: true }), { status: 200 });
    });
    const { getUserEmail } = await import("../src/lib/user");
    expect(await getUserEmail()).toBe("andrew@hill.com");
    expect(calls).toBe(1);
    // Second call: should use cache, no extra fetch.
    expect(await getUserEmail()).toBe("andrew@hill.com");
    expect(calls).toBe(1);
  });

  it("returns null when userinfo endpoint is unavailable", async () => {
    const auth = await import("../src/lib/auth");
    vi.mocked(auth.getUserInfoEndpoint).mockResolvedValueOnce(null);
    mockFetch(() => new Response("", { status: 500 }));
    const { getUserEmail } = await import("../src/lib/user");
    expect(await getUserEmail()).toBeNull();
  });

  it("returns null when userinfo response has no email", async () => {
    mockFetch(() => new Response(JSON.stringify({ sub: "abc" }), { status: 200 }));
    const { getUserEmail } = await import("../src/lib/user");
    expect(await getUserEmail()).toBeNull();
  });

  it("falls back to stale cache when remote fails", async () => {
    // Seed the cache with a stale entry (older than TTL).
    const { LocalStorage } = await import("./__mocks__/raycast-api");
    await LocalStorage.setItem(
      "superhuman.user_email.v1",
      JSON.stringify({ email: "old@hill.com", cached_at: 0 }),
    );
    mockFetch(() => new Response("", { status: 500 }));
    const { getUserEmail } = await import("../src/lib/user");
    expect(await getUserEmail()).toBe("old@hill.com");
  });
});

describe("injectThreadUrls", () => {
  beforeEach(() => {
    mockFetch(() => new Response(JSON.stringify({ email: "andrew@hill.com" }), { status: 200 }));
  });

  it("injects url next to thread_id in a flat object", async () => {
    const { injectThreadUrls } = await import("../src/lib/user");
    const out = (await injectThreadUrls({
      thread_id: "19e323f543459abf",
      subject: "Hello",
    })) as Record<string, string>;
    expect(out.url).toBe("https://mail.superhuman.com/andrew%40hill.com/thread/19e323f543459abf#app");
    expect(out.subject).toBe("Hello");
  });

  it("injects url for each item in a nested threads array", async () => {
    const { injectThreadUrls } = await import("../src/lib/user");
    const out = (await injectThreadUrls({
      threads: [
        { thread_id: "19e323f543459abf", subject: "A" },
        { thread_id: "a3c8de42f8001239", subject: "B" },
      ],
    })) as { threads: Array<{ url?: string }> };
    expect(out.threads[0].url).toContain("19e323f543459abf");
    expect(out.threads[1].url).toContain("a3c8de42f8001239");
  });

  it("respects camelCase threadId in addition to snake_case", async () => {
    const { injectThreadUrls } = await import("../src/lib/user");
    const out = (await injectThreadUrls({ threadId: "19e323f543459abf" })) as { url: string };
    expect(out.url).toContain("19e323f543459abf");
  });

  it("does not inject url when thread_id is not 16-char hex", async () => {
    const { injectThreadUrls } = await import("../src/lib/user");
    const out = (await injectThreadUrls({ thread_id: "not-hex-id" })) as Record<string, unknown>;
    expect(out.url).toBeUndefined();
  });

  it("preserves existing url field (does not overwrite)", async () => {
    const { injectThreadUrls } = await import("../src/lib/user");
    const out = (await injectThreadUrls({
      thread_id: "19e323f543459abf",
      url: "https://existing.example/thread/abc",
    })) as { url: string };
    expect(out.url).toBe("https://existing.example/thread/abc");
  });

  it("returns input unchanged when email cannot be resolved", async () => {
    const auth = await import("../src/lib/auth");
    vi.mocked(auth.getUserInfoEndpoint).mockResolvedValueOnce(null);
    mockFetch(() => new Response("", { status: 500 }));
    const { injectThreadUrls } = await import("../src/lib/user");
    const input = { thread_id: "19e323f543459abf" };
    const out = await injectThreadUrls(input);
    expect((out as Record<string, unknown>).url).toBeUndefined();
  });
});
