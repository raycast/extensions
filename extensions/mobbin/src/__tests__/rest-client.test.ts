import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobbinError } from "../lib/errors";
import { MobbinRestClient } from "../lib/rest-client";
import type { SearchOptions } from "../lib/types";

const options: SearchOptions = {
  query: "login screen",
  platform: "ios",
  mode: "deep",
  image_quality: "optimized",
  limit: 20,
  exclude_screen_ids: [],
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

  it("posts search options and normalizes screens", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        screens: [
          {
            id: "screen-1",
            image_url: "https://example.com/screen.png",
            mobbin_url: "https://mobbin.com/screen",
            app_name: "Example",
            platform: "ios",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new MobbinRestClient("secret").searchScreens(options);

    expect(result).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mobbin.com/v1/screens/search",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer secret" }),
      }),
    );
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
      vi.fn().mockResolvedValue(jsonResponse(status, { error: "failed" })),
    );

    await expect(
      new MobbinRestClient("secret").searchScreens(options),
    ).rejects.toMatchObject({
      code,
    } satisfies Partial<MobbinError>);
  });

  it("retries 429 responses and preserves Retry-After metadata", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(429, { error: "rate limited" }, { "Retry-After": "1" }),
        ),
    );

    const promise = new MobbinRestClient("secret")
      .searchScreens(options)
      .catch((error) => error as MobbinError);
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toMatchObject({
      code: "rate-limited",
      details: { retryAfterSeconds: 1 },
    } satisfies Partial<MobbinError>);
  });

  it("rejects missing API keys before network calls", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      new MobbinRestClient("").searchScreens(options),
    ).rejects.toMatchObject({
      code: "missing-api-key",
    } satisfies Partial<MobbinError>);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
