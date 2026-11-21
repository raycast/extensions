import { afterEach, describe, expect, it, vi } from "vitest";
import { AI, environment } from "@raycast/api";
import { createProvider, OpenAiCompatibleProvider, RaycastAiProvider } from "../src/services/ai-provider";

const request = { system: "sys", user: "usr" };
const prefs = (p: Partial<Preferences>) => p as Preferences;

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("createProvider", () => {
  it("defaults to Raycast AI", () => {
    expect(createProvider(prefs({}))).toBeInstanceOf(RaycastAiProvider);
  });

  it("requires URL, model and key for the external provider", () => {
    expect(() =>
      createProvider(prefs({ provider: "openai-compatible", externalBaseUrl: "https://x/v1" })),
    ).toThrowError(expect.objectContaining({ kind: "unavailable" }));
  });

  it("builds the external provider when configured", () => {
    const p = createProvider(
      prefs({
        provider: "openai-compatible",
        externalBaseUrl: "https://x/v1",
        externalModel: "m",
        externalApiKey: "k",
      }),
    );
    expect(p).toBeInstanceOf(OpenAiCompatibleProvider);
  });
});

describe("RaycastAiProvider", () => {
  it("reports unavailable when the user cannot access AI", async () => {
    vi.spyOn(environment, "canAccess").mockReturnValue(false);
    await expect(new RaycastAiProvider(1000).complete(request)).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("maps an AI.ask failure to a typed error", async () => {
    vi.spyOn(environment, "canAccess").mockReturnValue(true);
    vi.spyOn(AI, "ask").mockRejectedValue(new Error("boom"));
    await expect(new RaycastAiProvider(1000).complete(request)).rejects.toMatchObject({ kind: "failed" });
  });

  it("passes the configured model to AI.ask and falls back to Raycast's default for unknown values", async () => {
    vi.spyOn(environment, "canAccess").mockReturnValue(true);
    const ask = vi.spyOn(AI, "ask").mockResolvedValue("ok" as never);
    await new RaycastAiProvider(1000, "Anthropic_Claude_4.6_Sonnet").complete(request);
    expect(ask.mock.calls[0][1]).toMatchObject({ creativity: "none", model: "anthropic-claude-sonnet-4-6" });
    await new RaycastAiProvider(1000, "No_Such_Model").complete(request);
    expect(ask.mock.calls[1][1]?.model).toBeUndefined();
  });

  it("times out when AI.ask never resolves", async () => {
    vi.useFakeTimers();
    vi.spyOn(environment, "canAccess").mockReturnValue(true);
    vi.spyOn(AI, "ask").mockReturnValue(new Promise(() => {}) as never);
    const result = new RaycastAiProvider(5000).complete(request);
    const assertion = expect(result).rejects.toMatchObject({ kind: "timeout" });
    await vi.advanceTimersByTimeAsync(5001);
    await assertion;
  });
});

describe("OpenAiCompatibleProvider", () => {
  const config = { baseUrl: "https://api.test/v1/", model: "m", apiKey: "secret", timeoutMs: 1000 };

  it("posts to /chat/completions and returns the message content", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new OpenAiCompatibleProvider(config).complete(request)).resolves.toBe("ok");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.test/v1/chat/completions");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer secret");
  });

  it.each([401, 403])("maps HTTP %i to an auth error", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status })));
    await expect(new OpenAiCompatibleProvider(config).complete(request)).rejects.toMatchObject({ kind: "auth" });
  });

  it("maps other HTTP errors without leaking the response body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("echoed user text", { status: 500 })));
    const error = await new OpenAiCompatibleProvider(config).complete(request).catch((e) => e);
    expect(error.kind).toBe("failed");
    expect(error.message).not.toContain("echoed user text");
  });

  it("maps a network failure to unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(new OpenAiCompatibleProvider(config).complete(request)).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("times out and aborts the request", async () => {
    vi.useFakeTimers();
    let aborted = false;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        init.signal?.addEventListener("abort", () => (aborted = true));
        return new Promise(() => {});
      }),
    );
    const result = new OpenAiCompatibleProvider(config).complete(request);
    const assertion = expect(result).rejects.toMatchObject({ kind: "timeout" });
    await vi.advanceTimersByTimeAsync(1001);
    await assertion;
    expect(aborted).toBe(true);
  });
});
