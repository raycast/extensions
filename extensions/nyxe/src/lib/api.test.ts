import { describe, expect, it, vi } from "vitest";
import { createClient, DEFAULT_API_BASE_URL, normalizeBaseUrl, NyxeApiError } from "./api";

function fakeFetch(respond: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return respond(String(url), init ?? {});
  });
  return { fetch: fn as unknown as typeof fetch, calls };
}

const TOKEN = "nyxe_pat_0123456789abcdefghijABCDEFGHIJ0123456789abc";

describe("normalizeBaseUrl", () => {
  it("defaults to production and trims trailing slashes", () => {
    expect(normalizeBaseUrl(undefined)).toBe(DEFAULT_API_BASE_URL);
    expect(normalizeBaseUrl("   ")).toBe(DEFAULT_API_BASE_URL);
    expect(normalizeBaseUrl(" https://convex-site-dev.nyxe.app/// ")).toBe("https://convex-site-dev.nyxe.app");
  });
});

describe("createClient", () => {
  it("sends the bearer token to the versioned path", async () => {
    const { fetch, calls } = fakeFetch(() => Response.json({ unread: 3, threads: [] }));
    const client = createClient({ token: ` ${TOKEN} `, fetch });
    expect(await client.inboxSummary()).toEqual({ unread: 3, threads: [] });
    expect(calls[0]!.url).toBe("https://convex-site.nyxe.app/api/v1/inbox/summary");
    expect(calls[0]!.init.method).toBe("GET");
    expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("builds query strings and drops empty values", async () => {
    const { fetch, calls } = fakeFetch(() => Response.json({ threads: [], nextCursor: null, total: 0 }));
    const client = createClient({ token: TOKEN, baseUrl: "https://example.test/", fetch });
    await client.inbox({ unread: true, limit: 25, cursor: null });
    await client.inbox({});
    await client.search("from:ada & co", { limit: 5 });
    expect(calls.map((c) => c.url)).toEqual([
      "https://example.test/api/v1/inbox?unread=true&limit=25",
      "https://example.test/api/v1/inbox",
      "https://example.test/api/v1/search?q=from%3Aada+%26+co&limit=5",
    ]);
  });

  it("encodes path ids and posts JSON bodies", async () => {
    const { fetch, calls } = fakeFetch(() => Response.json({ snoozed: 1 }));
    const client = createClient({ token: TOKEN, fetch });
    await client.snooze("T/1", 1_800_000_000_000);
    expect(calls[0]!.url).toBe("https://convex-site.nyxe.app/api/v1/threads/T%2F1/snooze");
    expect(calls[0]!.init.method).toBe("POST");
    expect(calls[0]!.init.body).toBe(JSON.stringify({ wakeAt: 1_800_000_000_000 }));
    expect((calls[0]!.init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("uses DELETE to remove a tag and POST to add one", async () => {
    const { fetch, calls } = fakeFetch(() => Response.json({ ok: true }));
    const client = createClient({ token: TOKEN, fetch });
    await client.setTag("T1", "tag1", true);
    await client.setTag("T1", "tag1", false);
    expect(calls.map((c) => `${c.init.method} ${c.url}`)).toEqual([
      "POST https://convex-site.nyxe.app/api/v1/threads/T1/tags/tag1",
      "DELETE https://convex-site.nyxe.app/api/v1/threads/T1/tags/tag1",
    ]);
  });

  it("uploads raw bytes with the file's content type", async () => {
    const { fetch, calls } = fakeFetch(() =>
      Response.json({ blobId: "B", name: "a.pdf", type: "application/pdf", size: 3 }),
    );
    const client = createClient({ token: TOKEN, fetch });
    const bytes = new Uint8Array([1, 2, 3]);
    await client.uploadAttachment("a b.pdf", bytes, "application/pdf");
    expect(calls[0]!.url).toBe("https://convex-site.nyxe.app/api/v1/attachments?name=a+b.pdf");
    expect(calls[0]!.init.body).toBe(bytes);
    expect((calls[0]!.init.headers as Record<string, string>)["Content-Type"]).toBe("application/pdf");
  });

  it("unwraps the sign-in match", async () => {
    const { fetch, calls } = fakeFetch(() => Response.json({ match: null }));
    const client = createClient({ token: TOKEN, fetch });
    expect(await client.latestSignIn({ kind: "code" })).toBeNull();
    expect(calls[0]!.url).toBe("https://convex-site.nyxe.app/api/v1/codes/latest?kind=code&withinMinutes=15");
  });

  it("turns the API's error shape into a typed error", async () => {
    const { fetch } = fakeFetch(() =>
      Response.json(
        { error: { code: "insufficient_scope", message: "Token is missing the mail:send scope", scope: "mail:send" } },
        { status: 403 },
      ),
    );
    const client = createClient({ token: TOKEN, fetch });
    const err = await client.send({ to: ["a@b.c"], subject: "x", text: "y" }).catch((e) => e);
    expect(err).toBeInstanceOf(NyxeApiError);
    expect(err).toMatchObject({ status: 403, code: "insufficient_scope", scope: "mail:send" });
  });

  it("reads Retry-After on a 429", async () => {
    const { fetch } = fakeFetch(
      () =>
        new Response(JSON.stringify({ error: { code: "rate_limited", message: "Slow down. Too many requests." } }), {
          status: 429,
          headers: { "Retry-After": "12" },
        }),
    );
    const err = await createClient({ token: TOKEN, fetch })
      .me()
      .catch((e) => e);
    expect(err).toMatchObject({ status: 429, code: "rate_limited", retryAfterSeconds: 12 });
  });

  it("survives a non-JSON error page", async () => {
    const { fetch } = fakeFetch(() => new Response("<html>Bad gateway</html>", { status: 502 }));
    const err = await createClient({ token: TOKEN, fetch })
      .me()
      .catch((e) => e);
    expect(err).toMatchObject({ status: 502, code: "internal", message: "Nyxe answered 502" });
  });

  it("reports a network failure as its own code", async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof globalThis.fetch;
    const err = await createClient({ token: TOKEN, fetch })
      .me()
      .catch((e) => e);
    expect(err).toMatchObject({ status: 0, code: "network_error" });
  });
});
