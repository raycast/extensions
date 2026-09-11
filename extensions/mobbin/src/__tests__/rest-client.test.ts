import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobbinError } from "../lib/errors";
import { MobbinRestClient } from "../lib/rest-client";
import type { SearchOptions } from "../lib/types";

const options: SearchOptions = {
  kind: "screen",
  query: "login screen",
  platform: "ios",
  mode: "deep",
  imageQuality: "optimized",
  mcpImageFormat: "webp",
  limit: 20,
  excludeScreenIds: [],
};

function jsonResponse(
  status: number,
  body: unknown,
  headers?: HeadersInit,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("MobbinRestClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("posts the documented wire fields and preserves image metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        screens: [
          {
            id: "screen-1",
            image: {
              url: "https://example.com/screen.webp",
              url_expires_at: "2030-01-01T00:00:00Z",
              width: 1200,
              height: 2400,
            },
            mobbin_url: "https://mobbin.com/screens/screen-1",
            app_name: "Example",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new MobbinRestClient(" secret ").search(options);

    expect(result[0]).toMatchObject({
      kind: "screen",
      appName: "Example",
      image: {
        url: "https://example.com/screen.webp",
        expiresAt: "2030-01-01T00:00:00Z",
        width: 1200,
        height: 2400,
      },
    });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      query: "login screen",
      platform: "ios",
      mode: "deep",
      limit: 20,
      image_quality: "optimized",
      exclude_screen_ids: [],
    });
    expect(init.headers).toMatchObject({ Authorization: "Bearer secret" });
  });

  it.each([
    [400, "bad-request"],
    [401, "invalid-api-key"],
    [403, "plan-required"],
    [404, "not-found"],
    [500, "server-error"],
  ] as const)("maps HTTP %s to %s", async (status, code) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(status, {
          error: { code: "failed", message: "Detailed failure" },
        }),
      ),
    );

    await expect(
      new MobbinRestClient("secret").search(options),
    ).rejects.toMatchObject({
      code,
      message: "Detailed failure",
      details: { status, serverCode: "failed" },
    } satisfies Partial<MobbinError>);
  });

  it("retries a rate limit and returns a later successful response", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          429,
          { error: { message: "wait" } },
          { "Retry-After": "0" },
        ),
      )
      .mockResolvedValueOnce(jsonResponse(200, { screens: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const pending = new MobbinRestClient("secret").search(options);
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries 429 responses and preserves Retry-After metadata", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(429, { error: "limited" }, { "Retry-After": "0" }),
        ),
    );

    const promise = new MobbinRestClient("secret")
      .search(options)
      .catch((error: unknown) => error as MobbinError);
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toMatchObject({
      code: "rate-limited",
      details: { retryAfterSeconds: 0 },
    });
  });

  it("rejects unsupported kinds, missing keys, and oversized queries", async () => {
    await expect(
      new MobbinRestClient("secret").search({ ...options, kind: "flow" }),
    ).rejects.toMatchObject({ code: "unsupported-kind" });
    await expect(
      new MobbinRestClient("").search(options),
    ).rejects.toMatchObject({ code: "missing-api-key" });
    await expect(
      new MobbinRestClient("secret").search({
        ...options,
        query: "x".repeat(501),
      }),
    ).rejects.toMatchObject({ code: "invalid-query" });
    await expect(
      new MobbinRestClient("secret").search({
        ...options,
        excludeScreenIds: Array.from({ length: 101 }, (_, index) =>
          String(index),
        ),
      }),
    ).rejects.toMatchObject({ code: "bad-request" });
  });

  it("reports invalid JSON and response contract mismatches", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response("not-json", { status: 200 })),
    );
    await expect(
      new MobbinRestClient("secret").search(options),
    ).rejects.toMatchObject({ code: "contract-mismatch" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(jsonResponse(200, { results: [] })),
    );
    await expect(
      new MobbinRestClient("secret").search(options),
    ).rejects.toMatchObject({ code: "contract-mismatch" });
  });

  it("forwards cancellation to fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          if (init.signal?.aborted) {
            reject(new DOMException("aborted", "AbortError"));
            return;
          }
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        });
      }),
    );
    const controller = new AbortController();
    const promise = new MobbinRestClient("secret").search(
      options,
      controller.signal,
    );
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("reports search timeouts distinctly", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const rejectAbort = () =>
            reject(init.signal?.reason ?? new Error("aborted"));
          if (init.signal?.aborted) rejectAbort();
          else
            init.signal?.addEventListener("abort", rejectAbort, {
              once: true,
            });
        });
      }),
    );
    const pending = new MobbinRestClient("secret")
      .search(options)
      .catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(60_000);
    await expect(pending).resolves.toMatchObject({ code: "timeout" });
  });

  it("preserves ordinary network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("socket closed")),
    );
    await expect(
      new MobbinRestClient("secret").search(options),
    ).rejects.toMatchObject({
      code: "network-error",
      message: "socket closed",
    });
  });
});
