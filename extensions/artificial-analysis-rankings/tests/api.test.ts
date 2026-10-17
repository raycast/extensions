import { describe, expect, it, vi } from "vitest";
import { errorMessage, fetchLeaderboard, LeaderboardError, MODELS_ENDPOINT } from "../src/lib/api";
import { apiModel, NOW, page } from "./fixtures";

describe("Artificial Analysis API", () => {
  it("fetches every page with a header-only credential and normalizes the documented free shape", async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockResolvedValueOnce(Response.json(page([apiModel("one")], 1, 2)));
    fetcher.mockResolvedValueOnce(Response.json(page([apiModel("two", 70)], 2, 2)));
    const { snapshot } = await fetchLeaderboard(" test-key-not-real ", { fetcher, now: () => NOW });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[0][0])).toBe(`${MODELS_ENDPOINT}?page=1`);
    expect(String(fetcher.mock.calls[1][0])).toBe(`${MODELS_ENDPOINT}?page=2`);
    expect(fetcher.mock.calls[0][1]?.headers).toEqual({ "x-api-key": "test-key-not-real", Accept: "application/json" });
    expect(snapshot).toMatchObject({ fetchedAt: NOW, indexVersion: 4.3 });
    expect(snapshot.models.map(({ id }) => id)).toEqual(["one", "two"]);
    expect(snapshot.models[0]).toMatchObject({
      intelligence: 50,
      coding: 42,
      inputPrice: 0.25,
      outputPrice: 1.5,
      speed: 150.5,
      latency: 0.65,
      creatorId: "example-lab",
    });
    expect(JSON.stringify(snapshot)).not.toContain("test-key-not-real");
  });

  it("treats missing measurements as unavailable, keeping zero measurements", async () => {
    const record = {
      ...apiModel(),
      evaluations: { artificial_analysis_intelligence_index: 0 },
      pricing: null,
      performance: null,
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(page([record])));
    const { snapshot } = await fetchLeaderboard("test-key", { fetcher });
    expect(snapshot.models[0]).toMatchObject({
      intelligence: 0,
      coding: null,
      inputPrice: null,
      outputPrice: null,
      speed: null,
    });
  });

  it("supports an empty dataset", async () => {
    const empty = page([]);
    empty.pagination.total_pages = 0;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(empty));
    expect((await fetchLeaderboard("test-key", { fetcher })).snapshot.models).toEqual([]);
  });

  it.each([401, 403, 500])("reports HTTP %i without exposing the response body or key", async (status) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("test-key secret body", { status }));
    const error = await fetchLeaderboard("test-key", { fetcher }).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(LeaderboardError);
    expect(errorMessage(error)).not.toContain("test-key");
    expect(errorMessage(error)).not.toContain("secret body");
  });

  it("does not send a request without a key", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(fetchLeaderboard(" ", { fetcher })).rejects.toMatchObject({ kind: "authentication" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("honors Retry-After and the later rate-limit reset", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 429,
        headers: { "Retry-After": "60", "X-RateLimit-Reset": String(NOW / 1000 + 120) },
      }),
    );
    await expect(fetchLeaderboard("test-key", { fetcher, now: () => NOW })).rejects.toMatchObject({
      kind: "rate-limit",
      retryAt: NOW + 120_000,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("supports an HTTP date for Retry-After", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(null, { status: 429, headers: { "Retry-After": new Date(NOW + 120_000).toUTCString() } }),
      );
    await expect(fetchLeaderboard("test-key", { fetcher, now: () => NOW })).rejects.toMatchObject({
      retryAt: NOW + 120_000,
    });
  });

  it("uses a cooldown when the server omits rate-limit headers", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 429 }));
    await expect(fetchLeaderboard("test-key", { fetcher, now: () => NOW })).rejects.toMatchObject({
      retryAt: NOW + 3_600_000,
    });
  });

  it("stops before the next page when the quota is exhausted", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(page([apiModel()], 1, 2), {
        headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(NOW / 1000 + 120) },
      }),
    );
    await expect(fetchLeaderboard("test-key", { fetcher, now: () => NOW })).rejects.toMatchObject({
      kind: "rate-limit",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("keeps a successful final page while reporting an exhausted quota", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(page(), {
        headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(NOW / 1000 + 120) },
      }),
    );
    const result = await fetchLeaderboard("test-key", { fetcher, now: () => NOW });
    expect(result.snapshot.models).toHaveLength(1);
    expect(result.retryAt).toBe(NOW + 120_000);
  });

  it.each([
    { ...page(), data: "invalid" },
    { ...page(), intelligence_index_version: null },
    { ...page(), pagination: { ...page().pagination, has_more: true } },
    { ...page(), pagination: { ...page().pagination, page: 2 } },
    { ...page(), pagination: { ...page().pagination, total_pages: 101 } },
    page([{ ...apiModel(), model_creator: null }]),
  ])("rejects malformed data or inconsistent pagination", async (body) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body));
    await expect(fetchLeaderboard("test-key", { fetcher })).rejects.toMatchObject({ kind: "invalid-data" });
  });

  it.each(["duplicate", "version", "page-count", "empty-page"])(
    "rejects an inconsistent second page: %s",
    async (failure) => {
      const second = page([apiModel("two")], 2, 2);
      if (failure === "duplicate") second.data = [apiModel("one")];
      if (failure === "version") second.intelligence_index_version = 5;
      if (failure === "page-count") {
        second.pagination.total_pages = 3;
        second.pagination.has_more = true;
      }
      if (failure === "empty-page") second.data = [];
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(Response.json(page([apiModel("one")], 1, 2)))
        .mockResolvedValueOnce(Response.json(second));
      await expect(fetchLeaderboard("test-key", { fetcher })).rejects.toMatchObject({ kind: "invalid-data" });
    },
  );

  it("rejects a non-JSON response", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("<html>Oops</html>"));
    await expect(fetchLeaderboard("test-key", { fetcher })).rejects.toMatchObject({ kind: "invalid-data" });
  });

  it("reports network errors safely", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("URL contains a secret"));
    await expect(fetchLeaderboard("test-key", { fetcher })).rejects.toMatchObject({ kind: "network" });
    expect(errorMessage(new Error("private"))).not.toContain("private");
  });

  it("aborts a request on timeout", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
            once: true,
          });
        }),
    );
    await expect(fetchLeaderboard("test-key", { fetcher, timeoutMs: 5 })).rejects.toMatchObject({ kind: "timeout" });
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("does not start work when the command has been closed", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = vi.fn<typeof fetch>();
    await expect(fetchLeaderboard("test-key", { fetcher, signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
