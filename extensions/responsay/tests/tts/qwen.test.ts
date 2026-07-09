import { describe, it, expect, vi } from "vitest";
import { synthesizeQwen } from "../../src/tts/qwen";
import type { TtsConfig } from "../../src/tts/types";

const cfg: TtsConfig = {
  provider: "qwen",
  apiKey: "sk",
  voice: "Cherry",
  model: "qwen3-tts-flash",
  baseURL: "https://dashscope.aliyuncs.com/api/v1",
};

describe("synthesizeQwen", () => {
  it("decodes base64 audio from the response", async () => {
    const b64 = Buffer.from("RIFFfake").toString("base64");
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ output: { audio: { data: b64 } } }),
    })) as unknown as typeof fetch;
    const out = await synthesizeQwen(
      "hello",
      { rate: 1, instructions: "" },
      cfg,
      fetchImpl,
    );
    expect(out.bytes.toString()).toBe("RIFFfake");
    const [url] = (fetchImpl as unknown as { mock: { calls: [string][] } }).mock
      .calls[0];
    expect(url).toContain("/services/aigc/multimodal-generation/generation");
  });
  it("downloads audio when only a URL is returned", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ output: { audio: { url: "https://x/a.wav" } } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: async () => new TextEncoder().encode("AUDIO").buffer,
      });
    const out = await synthesizeQwen(
      "hi",
      { rate: 1, instructions: "" },
      cfg,
      fetchImpl as unknown as typeof fetch,
    );
    expect(out.bytes.toString()).toBe("AUDIO");
  });
  it("switches to the instruct model and sends instructions when slow", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        output: { audio: { data: Buffer.from("x").toString("base64") } },
      }),
    })) as unknown as typeof fetch;
    await synthesizeQwen(
      "hi",
      { rate: 0.5, instructions: "speak slowly" },
      cfg,
      fetchImpl,
    );
    const [, init] = (
      fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }
    ).mock.calls[0];
    expect(init.body).toContain("qwen3-tts-instruct-flash");
    expect(init.body).toContain("speak slowly");
  });
  it("sends instructions when the configured Qwen model is instruct", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        output: { audio: { data: Buffer.from("x").toString("base64") } },
      }),
    })) as unknown as typeof fetch;
    await synthesizeQwen(
      "hi",
      { rate: 1, instructions: "read with contrastive stress" },
      { ...cfg, model: "qwen3-tts-instruct-flash" },
      fetchImpl,
    );
    const [, init] = (
      fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }
    ).mock.calls[0];
    expect(init.body).toContain("qwen3-tts-instruct-flash");
    expect(init.body).toContain("read with contrastive stress");
  });
  it("throws a clear error when the audio URL download is non-2xx", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ output: { audio: { url: "https://x/a.wav" } } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => "Forbidden: url expired",
        // A non-2xx body must NOT be treated as audio bytes.
        arrayBuffer: async () =>
          new TextEncoder().encode("Forbidden: url expired").buffer,
      });
    await expect(
      synthesizeQwen(
        "hi",
        { rate: 1, instructions: "" },
        cfg,
        fetchImpl as unknown as typeof fetch,
      ),
    ).rejects.toThrow(/audio download 403/);
  });
});
