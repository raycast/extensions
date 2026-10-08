import { describe, expect, it, vi } from "vitest";
import {
  ApiError,
  HttpClient,
  authenticatedFetch,
  type AuthTokenProvider,
} from "./http";
import type { FetchLike } from "./oauth-protocol";

function response(body: unknown, status = 200): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function auth(tokens = ["access-old"]): AuthTokenProvider & {
  getAccessToken: ReturnType<typeof vi.fn>;
} {
  return {
    getAccessToken: vi
      .fn<(forceRefresh?: boolean) => Promise<string | undefined>>()
      .mockImplementation(async (forceRefresh) =>
        forceRefresh ? tokens[1] : tokens[0],
      ),
  };
}

describe("HttpClient", () => {
  it("injects bearer auth and parses a JSON response", async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(response({ ok: true }));
    const client = new HttpClient({
      origin: "https://api.everyapi.ai",
      auth: auth(),
      fetch,
    });

    await expect(client.get<{ ok: boolean }>("/api/example")).resolves.toEqual({
      ok: true,
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.everyapi.ai/api/example");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer access-old",
    );
  });

  it("refreshes once after HTTP 401", async () => {
    const provider = auth(["access-old", "access-new"]);
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(response({ message: "expired" }, 401))
      .mockResolvedValueOnce(response({ ok: true }));
    const client = new HttpClient({
      origin: "https://api.everyapi.ai",
      auth: provider,
      fetch,
    });

    await expect(client.get("/api/example")).resolves.toEqual({ ok: true });
    expect(provider.getAccessToken).toHaveBeenNthCalledWith(2, true);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(
      new Headers(fetch.mock.calls[1][1]?.headers).get("Authorization"),
    ).toBe("Bearer access-new");
  });

  it("does not refresh a policy or upstream HTTP 403", async () => {
    const provider = auth(["access-old", "access-new"]);
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValue(response({ message: "request blocked" }, 403));

    const result = await authenticatedFetch(
      provider,
      fetch,
      "https://api.everyapi.ai/v1/chat/completions",
      { method: "POST" },
    );

    expect(result.status).toBe(403);
    expect(provider.getAccessToken).toHaveBeenCalledTimes(1);
    expect(provider.getAccessToken).toHaveBeenCalledWith(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry non-authentication failures", async () => {
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValue(response({ message: "rate limited" }, 429));
    const client = new HttpClient({
      origin: "https://api.everyapi.ai",
      auth: auth(),
      fetch,
    });

    await expect(client.get("/api/example")).rejects.toMatchObject({
      status: 429,
      message: "rate limited",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not leak a bearer token from non-JSON error bodies", async () => {
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValue(response("proxy echoed access-secret", 502));
    const client = new HttpClient({
      origin: "https://api.everyapi.ai",
      auth: auth(["access-secret"]),
      fetch,
    });

    try {
      await client.get("/api/example");
      throw new Error("expected request to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).message).toBe(
        "EveryAPI request failed (HTTP 502)",
      );
      expect((error as ApiError).message).not.toContain("access-secret");
    }
  });

  it("aborts requests at the configured timeout", async () => {
    const fetch: FetchLike = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    const client = new HttpClient({
      origin: "https://api.everyapi.ai",
      auth: auth(),
      fetch,
      timeoutMs: 1,
    });

    await expect(client.get("/api/example")).rejects.toThrow(
      "EveryAPI request timed out",
    );
  });
});
