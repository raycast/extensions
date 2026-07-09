import { describe, it, expect, vi } from "vitest";
import { synthesizeGemini } from "../../src/tts/gemini";
import { TtsError } from "../../src/tts/openai";
import type { TtsConfig } from "../../src/tts/types";

const cfg: TtsConfig = {
  provider: "gemini",
  apiKey: "sk-gemini",
  voice: "Charon",
  model: "gemini-3.1-flash-tts-preview",
  baseURL: "https://generativelanguage.googleapis.com/v1beta",
};

describe("synthesizeGemini", () => {
  it("POSTs generateContent and wraps returned PCM as WAV", async () => {
    const b64 = Buffer.from("pcm").toString("base64");
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ inlineData: { data: b64 } }] } }],
      }),
    })) as unknown as typeof fetch;

    const out = await synthesizeGemini(
      "Hello there.",
      { rate: 1, instructions: "read clearly" },
      cfg,
      fetchImpl,
    );

    expect(out.ext).toBe("wav");
    expect(out.bytes.subarray(0, 4).toString()).toBe("RIFF");
    const [url, init] = (
      fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }
    ).mock.calls[0];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent",
    );
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      "sk-gemini",
    );
    expect(init.body).toContain("Charon");
  });

  it("throws TtsError when no audio is returned", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [] } }] }),
    })) as unknown as typeof fetch;
    await expect(
      synthesizeGemini("x", { rate: 1, instructions: "" }, cfg, fetchImpl),
    ).rejects.toBeInstanceOf(TtsError);
  });
});
