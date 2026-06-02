import { describe, it, expect, vi } from "vitest";
import { synthesizeMimo } from "../../src/tts/mimo";
import { TtsError } from "../../src/tts/openai";
import type { TtsConfig } from "../../src/tts/types";

const cfg: TtsConfig = {
  provider: "mimo",
  apiKey: "tp-x",
  voice: "Chloe",
  model: "mimo-v2.5-tts",
  baseURL: "https://token-plan-cn.xiaomimimo.com/v1",
};

describe("synthesizeMimo", () => {
  it("POSTs the text as an assistant message and decodes base64 audio", async () => {
    const b64 = Buffer.from("RIFFfake").toString("base64");
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { audio: { data: b64 } } }] }),
    })) as unknown as typeof fetch;
    const out = await synthesizeMimo(
      "Hello there.",
      { rate: 1, instructions: "read clearly" },
      cfg,
      fetchImpl,
    );
    expect(out.ext).toBe("wav");
    expect(out.bytes.toString()).toBe("RIFFfake");
    const [url, init] = (
      fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }
    ).mock.calls[0];
    expect(url).toBe(
      "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
    );
    expect((init.headers as Record<string, string>)["api-key"]).toBe("tp-x");
    const body = init.body as string;
    expect(body).toContain('"role":"assistant"');
    expect(body).toContain("Hello there.");
    expect(body).toContain('"voice":"Chloe"');
  });

  it("throws TtsError when the response carries no audio", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: {} }] }),
    })) as unknown as typeof fetch;
    await expect(
      synthesizeMimo("x", { rate: 1, instructions: "" }, cfg, fetchImpl),
    ).rejects.toBeInstanceOf(TtsError);
  });

  it("throws TtsError on non-2xx", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => "bad key",
    })) as unknown as typeof fetch;
    await expect(
      synthesizeMimo("x", { rate: 1, instructions: "" }, cfg, fetchImpl),
    ).rejects.toBeInstanceOf(TtsError);
  });
});
