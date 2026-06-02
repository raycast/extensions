import { describe, it, expect, vi } from "vitest";
import { synthesizeMinimax } from "../../src/tts/minimax";
import { TtsError } from "../../src/tts/openai";
import type { TtsConfig } from "../../src/tts/types";

const cfg: TtsConfig = {
  provider: "minimax",
  apiKey: "sk-mm",
  voice: "English_expressive_narrator",
  model: "speech-2.8-hd",
  baseURL: "https://api.minimaxi.com/v1",
};

describe("synthesizeMinimax", () => {
  it("POSTs to /t2a_v2 and decodes hex audio", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          data: { audio: Buffer.from("mp3fake").toString("hex") },
          base_resp: { status_code: 0 },
        }),
    })) as unknown as typeof fetch;

    const out = await synthesizeMinimax(
      "Hello there.",
      { rate: 1, instructions: "read clearly" },
      cfg,
      fetchImpl,
    );

    expect(out.ext).toBe("mp3");
    expect(out.bytes.toString()).toBe("mp3fake");
    const [url, init] = (
      fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }
    ).mock.calls[0];
    expect(url).toBe("https://api.minimaxi.com/v1/t2a_v2");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer sk-mm",
    );
    expect(init.body).toContain("English_expressive_narrator");
    expect(init.body).toContain("\"model\":\"speech-2.8-hd\"");
    expect(init.body).toContain("\"output_format\":\"hex\"");
  });

  it("passes the requested playback rate to MiniMax speed", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          data: { audio: Buffer.from("slow").toString("hex") },
          base_resp: { status_code: 0 },
        }),
    })) as unknown as typeof fetch;

    await synthesizeMinimax(
      "Hello there.",
      { rate: 0.5, instructions: "read slowly" },
      cfg,
      fetchImpl,
    );

    const body = JSON.parse(
      (
        fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }
      ).mock.calls[0][1].body as string,
    ) as { voice_setting: { speed: number } };
    expect(body.voice_setting.speed).toBe(0.5);
  });

  it("throws TtsError on provider error", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          base_resp: { status_code: 1001, status_msg: "bad key" },
        }),
    })) as unknown as typeof fetch;
    await expect(
      synthesizeMinimax("x", { rate: 1, instructions: "" }, cfg, fetchImpl),
    ).rejects.toBeInstanceOf(TtsError);
  });
});
