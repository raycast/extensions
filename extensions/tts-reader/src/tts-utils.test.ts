import { afterEach, describe, expect, it, vi } from "vitest";

describe("detectGateway cache", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("retries negative gateway detection on a later call", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, primaryEngine: "kokoro" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { detectGateway, resetGatewayCacheForTests } = await import("./tts-utils");
    resetGatewayCacheForTests();

    expect(await detectGateway("http://localhost:8000")).toBe(false);
    expect(await detectGateway("http://localhost:8000")).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("caches positive gateway detection", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, primaryEngine: "kokoro" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { detectGateway, resetGatewayCacheForTests } = await import("./tts-utils");
    resetGatewayCacheForTests();

    expect(await detectGateway("http://localhost:8000")).toBe(true);
    expect(await detectGateway("http://localhost:8000")).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
