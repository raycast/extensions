import { describe, expect, it, vi } from "vitest";
import { ApiError, TrackTimerApi } from "./api";

const operation = {
  id: "persisted-operation-123",
  path: "/timers/start",
  body: { projectId: "project-1", billable: true },
};
function setup(response: Response | Error = Response.json({ timer: null })) {
  const fetcher = vi.fn<typeof fetch>();
  if (response instanceof Error) fetcher.mockRejectedValue(response);
  else fetcher.mockResolvedValue(response);
  return {
    fetcher,
    api: new TrackTimerApi({
      baseUrl: "https://tracktimer.example",
      token: "secret-token",
      fetch: fetcher,
    }),
  };
}
describe("TrackTimer API", () => {
  it("sends bearer authentication and refuses redirects", async () => {
    const { api, fetcher } = setup();
    expect(await api.getTimer()).toBeNull();
    expect(fetcher).toHaveBeenCalledWith(
      "https://tracktimer.example/api/v1/timer",
      expect.objectContaining({
        redirect: "error",
        headers: expect.objectContaining({ Authorization: "Bearer secret-token" }),
      }),
    );
  });
  it.each([
    "http://example.com",
    "https://user:password@example.com",
    "https://example.com/?secret=1",
    "https://example.com/arbitrary",
    "file:///tmp/api",
  ])("rejects unsafe server URL %s before sending tokens", (baseUrl) => {
    expect(() => new TrackTimerApi({ baseUrl, token: "token" })).toThrow(ApiError);
  });
  it.each([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://[::1]:3000",
    "https://example.com/api/v1/",
  ])("accepts supported server URL %s", (baseUrl) => {
    expect(() => new TrackTimerApi({ baseUrl, token: "token" })).not.toThrow();
  });
  it("encodes cursors without allowing parameter injection", async () => {
    const { api, fetcher } = setup(Response.json({ entries: [], nextCursor: null }));
    await api.getEntries("abc&limit=999");
    const url = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(url.searchParams.get("cursor")).toBe("abc&limit=999");
    expect(url.searchParams.get("limit")).toBe("10");
  });
  it("requests the newest ten entries without a date cutoff", async () => {
    const { api, fetcher } = setup(Response.json({ entries: [], nextCursor: null }));
    await api.getEntries();
    const url = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect([...url.searchParams.entries()]).toEqual([["limit", "10"]]);
  });
  it("reuses the caller's persisted idempotency key on retries", async () => {
    const { api, fetcher } = setup(new Error("network failure"));
    await expect(api.mutate(operation)).rejects.toMatchObject({ uncertain: true });
    fetcher.mockResolvedValue(Response.json({ timer: null, stoppedTimerId: "old-timer" }));
    await api.mutate(operation);
    for (const [, options] of fetcher.mock.calls)
      expect(options?.headers).toMatchObject({ "Idempotency-Key": operation.id });
  });
  it.each([400, 401, 403, 409, 429])(
    "treats HTTP %s as definitive and never echoes response secrets",
    async (status) => {
      const { api } = setup(new Response("secret-token echoed by proxy", { status }));
      const error = await api.mutate(operation).catch((value: unknown) => value);
      expect(error).toMatchObject({ uncertain: false, status });
      expect(String(error)).not.toContain("secret-token");
    },
  );
  it.each([408, 500, 502, 503])("retains uncertain mutations on HTTP %s", async (status) => {
    const { api } = setup(new Response("error", { status }));
    await expect(api.mutate(operation)).rejects.toMatchObject({ uncertain: true });
  });
  it("treats an invalid successful mutation response as uncertain", async () => {
    const { api } = setup(Response.json({ timer: { id: "incomplete" } }));
    await expect(api.mutate(operation)).rejects.toMatchObject({ uncertain: true });
  });
  it("rejects malformed timer responses", async () => {
    const { api } = setup(Response.json({ timer: { startedAt: "invalid" } }));
    await expect(api.getTimer()).rejects.toMatchObject({ uncertain: false });
  });
  it("prevents a persisted mutation from redirecting credentials to another path", async () => {
    const { api, fetcher } = setup();
    await expect(api.mutate({ ...operation, path: "//evil.example" })).rejects.toThrow(ApiError);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("times out a mutation while preserving uncertainty and hiding transport errors", async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockImplementation(
          (_input, init) =>
            new Promise((_resolve, reject) =>
              init?.signal?.addEventListener("abort", () => reject(new Error("secret-token"))),
            ),
        );
      const api = new TrackTimerApi({
        baseUrl: "https://example.com",
        token: "secret-token",
        fetch: fetcher,
      });
      const result = api.mutate(operation).catch((error: unknown) => error);
      await vi.advanceTimersByTimeAsync(15_000);
      const error = await result;
      expect(error).toMatchObject({ uncertain: true });
      expect(String(error)).not.toContain("secret-token");
    } finally {
      vi.useRealTimers();
    }
  });
});

it("requests today's summary in the device timezone", async () => {
  const summary = { trackedSeconds: 3600, earnings: [{ currency: "USD", amount: "125.00" }] };
  const { api, fetcher } = setup(Response.json(summary));
  expect(await api.getSummary("America/Panama")).toEqual(summary);
  expect(new URL(String(fetcher.mock.calls[0]?.[0])).searchParams.get("timezone")).toBe(
    "America/Panama",
  );
});
it.each([
  { trackedSeconds: -1, earnings: [] },
  { trackedSeconds: 1, earnings: [{ currency: "USD", amount: "NaN" }] },
  { trackedSeconds: 1, earnings: [{ currency: "invalid", amount: "1.00" }] },
])("rejects malformed summaries", async (summary) => {
  const { api } = setup(Response.json(summary));
  await expect(api.getSummary("UTC")).rejects.toThrow("unexpected response");
});

it("describes temporary service failures without claiming the key expired", async () => {
  const { api } = setup(new Response("provider details must stay private", { status: 503 }));
  await expect(api.getTimer()).rejects.toMatchObject({
    status: 503,
    uncertain: false,
    message: expect.stringContaining("temporarily unavailable"),
  });
  await expect(api.mutate(operation)).rejects.toMatchObject({ status: 503, uncertain: true });
});
