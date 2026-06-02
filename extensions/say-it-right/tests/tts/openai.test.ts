import { describe, it, expect, vi } from "vitest";
import { synthesizeOpenAI, TtsError } from "../../src/tts/openai";
import type { TtsConfig } from "../../src/tts/types";

const cfg: TtsConfig = {
  provider: "openai",
  apiKey: "sk",
  voice: "alloy",
  model: "gpt-4o-mini-tts",
};

describe("synthesizeOpenAI", () => {
  it("POSTs to /v1/audio/speech and returns wav bytes", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => new TextEncoder().encode("RIFFfake").buffer,
    })) as unknown as typeof fetch;
    const out = await synthesizeOpenAI(
      "hello",
      { rate: 1, instructions: "read clearly" },
      cfg,
      fetchImpl,
    );
    expect(out.ext).toBe("wav");
    expect(out.bytes.length).toBeGreaterThan(0);
    const [url, init] = (
      fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }
    ).mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/audio/speech");
    expect(init.body).toContain('"response_format":"wav"');
    expect(init.body).toContain("read clearly");
  });
  it("throws TtsError on failure", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => "boom",
    })) as unknown as typeof fetch;
    await expect(
      synthesizeOpenAI("x", { rate: 1, instructions: "" }, cfg, fetchImpl),
    ).rejects.toBeInstanceOf(TtsError);
  });
  it("throws TtsError when the request times out", async () => {
    const fetchImpl = vi.fn(async () => {
      const e = new Error("timed out");
      e.name = "TimeoutError";
      throw e;
    }) as unknown as typeof fetch;
    await expect(synthesizeOpenAI("x", { rate: 1, instructions: "" }, cfg, fetchImpl)).rejects.toBeInstanceOf(TtsError);
  });
});
