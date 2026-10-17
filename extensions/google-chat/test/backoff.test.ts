import { describe, expect, it, vi } from "vitest";

import { createHttpClient, buildUrl } from "../src/api/http";
import { backoffDelay, mapLimit, parseRetryAfter, withBackoff } from "../src/helpers/backoff";
import { GoogleApiError, describeError, parseGoogleError } from "../src/helpers/errors";

describe("backoffDelay", () => {
  it("doubles from the base delay and caps at the max", () => {
    const noJitter = () => 0;
    expect([1, 2, 3, 4].map((a) => backoffDelay(a, 500, 3000, noJitter))).toEqual([500, 1000, 2000, 3000]);
  });

  it("adds at most 25% jitter", () => {
    expect(backoffDelay(1, 1000, 10_000, () => 0.999)).toBeLessThanOrEqual(1250);
  });

  it("honours a longer Retry-After", () => {
    expect(backoffDelay(1, 500, 8000, () => 0, 5000)).toBe(5000);
    expect(backoffDelay(1, 500, 8000, () => 0, 100)).toBe(500);
  });
});

describe("parseRetryAfter", () => {
  it("parses seconds and HTTP dates", () => {
    expect(parseRetryAfter("3")).toBe(3000);
    expect(parseRetryAfter("Wed, 14 Oct 2026 12:00:10 GMT", Date.parse("2026-10-14T12:00:00Z"))).toBe(10_000);
    expect(parseRetryAfter(null)).toBeUndefined();
  });
});

describe("withBackoff", () => {
  it("retries up to 3 tries in total and rethrows the last error", async () => {
    const sleep = vi.fn(async () => undefined);
    const fn = vi.fn(async () => {
      throw new Error("busy");
    });
    await expect(withBackoff(fn, () => ({ retry: true }), { sleep, random: () => 0 })).rejects.toThrow("busy");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map((c) => (c as unknown[])[0])).toEqual([500, 1000]);
  });

  it("stops at once for errors that shouldn't be retried", async () => {
    const fn = vi.fn(async () => {
      throw new Error("bad request");
    });
    await expect(withBackoff(fn, () => ({ retry: false }), { sleep: async () => undefined })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("returns the first success", async () => {
    let calls = 0;
    const result = await withBackoff(
      async () => {
        calls += 1;
        if (calls < 2) throw new Error("429");
        return "ok";
      },
      () => ({ retry: true }),
      { sleep: async () => undefined },
    );
    expect(result).toBe("ok");
    expect(calls).toBe(2);
  });
});

describe("mapLimit", () => {
  it("keeps order and never runs more than the limit at once", async () => {
    let running = 0;
    let peak = 0;
    const result = await mapLimit([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running -= 1;
      return n * 2;
    });
    expect(result).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(peak).toBeLessThanOrEqual(3);
  });
});

describe("http client", () => {
  const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers });

  it("retries 429 with backoff and then succeeds", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        json(429, { error: { code: 429, message: "Quota", status: "RESOURCE_EXHAUSTED" } }, { "retry-after": "0" }),
      )
      .mockResolvedValueOnce(json(200, { spaces: [] }));
    const client = createHttpClient({
      getToken: async () => "t",
      fetchImpl,
      backoff: { sleep: async () => undefined },
    });
    await expect(client.request("https://x/v1/spaces")).resolves.toEqual({ spaces: [] });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t");
  });

  it("gives up after 3 tries on repeated 429s", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json(429, { error: { code: 429, message: "Quota" } }));
    const client = createHttpClient({
      getToken: async () => "t",
      fetchImpl,
      backoff: { sleep: async () => undefined },
    });
    await expect(client.request("https://x")).rejects.toMatchObject({ status: 429 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("does not retry a 404 and surfaces a readable error", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      json(404, { error: { code: 404, message: "Space not found", status: "NOT_FOUND" } }),
    );
    const client = createHttpClient({ getToken: async () => "t", fetchImpl });
    await expect(client.request("https://x")).rejects.toThrow("Space not found");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("re-signs in once after a missing-scope error", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        json(403, {
          error: {
            code: 403,
            message: "Request had insufficient authentication scopes.",
            status: "PERMISSION_DENIED",
            details: [
              { "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT" },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(json(200, {}));
    const onScopeError = vi.fn(async () => true);
    const client = createHttpClient({ getToken: async () => "t", fetchImpl, onScopeError });
    await expect(client.request("https://x")).resolves.toEqual({});
    expect(onScopeError).toHaveBeenCalledTimes(1);
  });

  it("builds query strings with repeated parameters", () => {
    expect(
      buildUrl("https://x/v1/people:batchGet", {
        resourceNames: ["people/1", "people/2"],
        pageToken: undefined,
        pageSize: 5,
      }),
    ).toBe("https://x/v1/people:batchGet?resourceNames=people%2F1&resourceNames=people%2F2&pageSize=5");
  });
});

describe("errors", () => {
  it("parses Google error bodies", () => {
    const error = parseGoogleError(
      403,
      JSON.stringify({ error: { code: 403, message: "Nope", status: "PERMISSION_DENIED" } }),
    );
    expect(error).toBeInstanceOf(GoogleApiError);
    expect(error).toMatchObject({ status: 403, statusText: "PERMISSION_DENIED", message: "Nope" });
    expect(parseGoogleError(400, JSON.stringify({ error: "invalid_grant", error_description: "Bad" })).message).toBe(
      "invalid_grant: Bad",
    );
    expect(parseGoogleError(502, "<html>bad gateway</html>").message).toBe("<html>bad gateway</html>");
  });

  it("explains Workspace-only, sign-in and configuration errors", () => {
    expect(
      describeError(new GoogleApiError("Google Chat is only available to Google Workspace users.", { status: 403 })),
    ).toMatchObject({
      title: "Google Workspace account required",
      signInAgain: true,
    });
    expect(describeError(new Error("invalid_grant"))).toMatchObject({ signInAgain: true });
    expect(
      describeError(
        new GoogleApiError(
          "Google Chat app not found. To create a Chat app, you must turn on the Chat API and configure the app in the Google Cloud console.",
          { status: 404 },
        ),
      ).title,
    ).toBe("Chat app not configured");
    expect(describeError(new GoogleApiError("slow down", { status: 429 })).title).toBe("Rate limited");
  });
});
