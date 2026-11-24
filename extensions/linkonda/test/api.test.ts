import { afterEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL, createShortLink, type ShortenResult } from "../src/lib/api";
import { failureMarkdown, N1, N2, N3, N4, N5, N6, nextStep, TITLES } from "../src/lib/view";

type Failure = Extract<ShortenResult, { ok: false }>;

const created = {
  id: "abc",
  slug: "x7Kp2",
  shortUrl: "https://lnko.eu/x7Kp2",
  clickCount: 0,
  savedToAccount: false,
  tier: "anonymous",
  expiresAt: "2027-03-01T12:00:00.000Z",
  lifetimeUnlimited: false,
};

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

const stub = (response: Response | (() => Promise<Response>)) =>
  vi.fn<typeof fetch>(async () => (typeof response === "function" ? response() : response));

const fail = async (response: Response, key?: string): Promise<Failure> => {
  const result = await createShortLink("https://example.com/a", key, stub(response));
  expect(result.ok).toBe(false);
  return result as Failure;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("createShortLink", () => {
  it("sends only the URL, with the API key only when one is set", async () => {
    const anonymous = stub(json(201, created));
    await createShortLink("https://example.com/a", undefined, anonymous);
    expect(anonymous).toHaveBeenCalledTimes(1);
    const [url, init] = anonymous.mock.calls[0]!;
    expect(url).toBe("https://api.linkonda.com/api/links");
    expect(API_BASE_URL).toBe("https://api.linkonda.com");
    expect(init).toEqual({
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      redirect: "error",
      body: '{"url":"https://example.com/a"}',
      signal: expect.any(AbortSignal),
    });

    const withKey = stub(json(201, { ...created, savedToAccount: true }));
    await createShortLink("https://example.com/a", " lk_x ", withKey);
    expect(withKey.mock.calls[0]![1]).toEqual({
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: "Bearer lk_x" },
      redirect: "error",
      body: '{"url":"https://example.com/a"}',
      signal: expect.any(AbortSignal),
    });
  });

  it("treats a whitespace-only key as no key", async () => {
    const f = stub(json(201, created));
    await createShortLink("https://example.com/a", "  \t ", f);
    expect(Object.keys(f.mock.calls[0]![1]!.headers as Record<string, string>)).toEqual(["Accept", "Content-Type"]);
  });

  it("returns the created link on 201", async () => {
    expect(await createShortLink("https://example.com/a", undefined, stub(json(201, created)))).toEqual({
      ok: true,
      link: {
        id: "abc",
        slug: "x7Kp2",
        shortUrl: "https://lnko.eu/x7Kp2",
        expiresAt: "2027-03-01T12:00:00.000Z",
        savedToAccount: false,
      },
    });
    const keyed = await createShortLink(
      "https://example.com/a",
      "lk_x",
      stub(json(201, { ...created, savedToAccount: true, expiresAt: null })),
    );
    expect(keyed).toMatchObject({ ok: true, link: { savedToAccount: true, expiresAt: null } });
  });

  it("maps each code in AC-4 to its kind", async () => {
    const rows: [number, Record<string, unknown>, string | undefined, string, Partial<Failure>, string | undefined][] =
      [
        [
          429,
          { code: "QUOTA_EXCEEDED", tier: "anonymous" },
          undefined,
          TITLES.quotaAnonymous,
          { kind: "quota", anonymous: true },
          N1,
        ],
        [429, { code: "QUOTA_EXCEEDED" }, undefined, TITLES.quotaAnonymous, { kind: "quota", anonymous: true }, N1],
        [
          429,
          { code: "QUOTA_EXCEEDED", tier: "plus" },
          "lk_x",
          TITLES.quotaAccount,
          { kind: "quota", anonymous: false },
          N2,
        ],
        [429, { code: "QUOTA_EXCEEDED" }, "lk_x", TITLES.quotaAccount, { kind: "quota", anonymous: false }, N2],
        [429, { code: "RATE_LIMITED" }, undefined, "Too many requests", { kind: "rate-limited" }, N6],
        [400, { code: "DESTINATION_BLOCKED" }, undefined, "Linkonda refused this destination", { kind: "blocked" }, N3],
        [400, { code: "INVALID_URL" }, undefined, "Linkonda couldn't use this URL", { kind: "invalid-url" }, undefined],
        [
          400,
          { code: "VALIDATION_FAILED" },
          undefined,
          "Linkonda couldn't use this URL",
          { kind: "invalid-url" },
          undefined,
        ],
        [401, { code: "INVALID_API_KEY" }, "lk_x", "API key not accepted", { kind: "key" }, N4],
        [401, { code: "API_KEY_REVOKED" }, "lk_x", "API key not accepted", { kind: "key" }, N4],
        [403, { code: "API_KEY_REQUIRES_PAID" }, "lk_x", "This API key can't make links", { kind: "key" }, N5],
        [403, { code: "API_KEY_LIMIT_EXCEEDED" }, "lk_x", "This API key can't make links", { kind: "key" }, N5],
        [403, { code: "EMAIL_NOT_VERIFIED" }, "lk_x", "This API key can't make links", { kind: "key" }, N5],
        [
          500,
          { code: "INTERNAL_ERROR" },
          undefined,
          "Linkonda couldn't shorten the link right now",
          { kind: "unavailable" },
          N6,
        ],
        [503, {}, undefined, "Linkonda couldn't shorten the link right now", { kind: "unavailable" }, N6],
        [
          403,
          { code: "ORIGIN_NOT_ALLOWED" },
          undefined,
          "Linkonda couldn't shorten the link",
          { kind: "other" },
          undefined,
        ],
        [404, {}, undefined, "Linkonda couldn't shorten the link", { kind: "other" }, undefined],
      ];
    for (const [status, body, key, title, expected, step] of rows) {
      const failure = await fail(json(status, { error: "text", ...body }), key);
      expect(failure, `${status} ${JSON.stringify(body)} key=${key}`).toMatchObject({
        title,
        status,
        message: "text",
        ...expected,
      });
      expect(nextStep(failure), `${status} ${JSON.stringify(body)}`).toBe(step);
    }
  });

  it("lets the code decide over the status, except 5xx", async () => {
    expect(await fail(json(400, { code: "QUOTA_EXCEEDED", error: "x" }))).toMatchObject({ kind: "quota" });
    expect(await fail(json(403, { code: "RATE_LIMITED", error: "x" }))).toMatchObject({ kind: "rate-limited" });
    expect(await fail(json(418, { code: "DESTINATION_BLOCKED", error: "x" }))).toMatchObject({ kind: "blocked" });
    expect(await fail(json(502, { code: "DESTINATION_BLOCKED", error: "x" }))).toMatchObject({ kind: "unavailable" });
    expect(await fail(json(500, { code: "QUOTA_EXCEEDED", error: "x" }), "lk_x")).toMatchObject({
      kind: "unavailable",
    });
    expect(await fail(json(401, { code: "SOMETHING_NEW", error: "x" }))).toMatchObject({
      kind: "other",
      code: "SOMETHING_NEW",
    });
  });

  it("reads Retry-After", async () => {
    const failure = await fail(json(429, { code: "RATE_LIMITED", error: "slow" }, { "Retry-After": "42" }));
    expect(failure.retryAfter).toBe("42");
    expect(nextStep(failure)).toBe("Try again in 42 seconds.");
    const none = await fail(json(429, { code: "RATE_LIMITED", error: "slow" }));
    expect(none.retryAfter).toBeUndefined();
    expect(nextStep(none)).toBe("Try again in a moment.");
  });

  it("a fetch rejection is network", async () => {
    const result = await createShortLink(
      "https://example.com/a",
      "lk_x",
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed")),
    );
    expect(result).toEqual({ ok: false, kind: "network", title: "Couldn't reach Linkonda" });
    expect(nextStep(result as Failure)).toBe("Check your connection and try again.");
    // A redirect is a rejection too (`redirect: "error"`), as is a body that can't be read.
    const broken = new Response(new ReadableStream({ pull: (c) => c.error(new Error("reset")) }), { status: 201 });
    expect(await createShortLink("https://example.com/a", undefined, stub(broken))).toMatchObject({ kind: "network" });
  });

  it("no answer within 20 s is network", async () => {
    vi.useFakeTimers();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException("timed out", "TimeoutError")), ms);
      return controller.signal;
    });
    const hanging = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init!.signal!.addEventListener("abort", () => reject(init!.signal!.reason));
        }),
    );
    const pending = createShortLink("https://example.com/a", undefined, hanging);
    await vi.advanceTimersByTimeAsync(19_999);
    let settled = false;
    void pending.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toMatchObject({ ok: false, kind: "network" });
    expect(timeout).toHaveBeenCalledWith(20_000);
  });

  it("a 2xx without id, slug or an https shortUrl is unexpected", async () => {
    const bodies: unknown[] = [
      { ...created, id: undefined },
      { ...created, slug: 7 },
      { ...created, shortUrl: undefined },
      { ...created, shortUrl: "http://lnko.eu/x7Kp2" },
      { ...created, shortUrl: "javascript:alert(1)" },
      { ...created, shortUrl: "not a url" },
      { ...created, expiresAt: undefined },
      { ...created, expiresAt: 1798761600 },
      [],
      "text",
    ];
    for (const body of bodies) {
      const result = await createShortLink("https://example.com/a", undefined, stub(json(201, body)));
      expect(result, JSON.stringify(body)).toMatchObject({
        ok: false,
        kind: "unexpected",
        title: "Linkonda returned an unexpected response",
      });
      expect(nextStep(result as Failure)).toBe(N6);
    }
    const notJson = await createShortLink(
      "https://example.com/a",
      undefined,
      stub(new Response("<html>", { status: 200 })),
    );
    expect(notJson).toMatchObject({ ok: false, kind: "unexpected" });
  });

  it("a non-JSON error body shows HTTP <status>", async () => {
    const failure = await fail(new Response("<html>Bad gateway</html>", { status: 502 }));
    expect(failure).toMatchObject({ kind: "unavailable", status: 502 });
    expect(failure.message).toBeUndefined();
    expect(failureMarkdown(failure)).toContain("HTTP 502");
    const noError = await fail(json(404, { code: "NOT_FOUND" }));
    expect(failureMarkdown(noError)).toContain("HTTP 404");
  });

  it("the API key appears in no result or view", async () => {
    const key = "lk_secret_value";
    const results: ShortenResult[] = [
      await createShortLink("https://example.com/a", key, stub(json(201, created))),
      await createShortLink(
        "https://example.com/a",
        key,
        stub(json(401, { code: "INVALID_API_KEY", error: `bad ${key}` })),
      ),
      await createShortLink(
        "https://example.com/a",
        key,
        stub(json(429, { code: "RATE_LIMITED", error: "x" }, { "Retry-After": "5" })),
      ),
      await createShortLink("https://example.com/a", key, stub(json(500, {}))),
      await createShortLink(
        "https://example.com/a",
        key,
        vi.fn<typeof fetch>().mockRejectedValue(new Error(`boom ${key}`)),
      ),
      await createShortLink("https://example.com/a", key, stub(json(201, { id: 1 }))),
    ];
    for (const result of results) {
      expect(JSON.stringify(result)).not.toContain(key);
      if (!result.ok) expect(failureMarkdown(result)).not.toContain(key);
    }
  });
});
