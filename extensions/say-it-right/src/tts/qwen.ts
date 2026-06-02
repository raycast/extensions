import type { TtsConfig, SynthesizeOptions } from "./types";
import { TtsError, type SynthResult } from "./openai";

const TIMEOUT_MS = 60_000;

export async function synthesizeQwen(
  text: string,
  opts: SynthesizeOptions,
  cfg: TtsConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SynthResult> {
  const base = cfg.baseURL ?? "https://dashscope.aliyuncs.com/api/v1";
  const instruct = opts.rate < 1 || cfg.model === "qwen3-tts-instruct-flash";
  const model = instruct ? "qwen3-tts-instruct-flash" : cfg.model;
  const body: Record<string, unknown> = {
    model,
    input: {
      text,
      voice: cfg.voice,
      language_type: "English",
      ...(instruct ? { instructions: opts.instructions } : {}),
    },
  };

  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetchImpl(
      `${base}/services/aigc/multimodal-generation/generation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError")
      throw new TtsError(
        `Qwen TTS timed out after ${TIMEOUT_MS / 1000}s. Check your network and the region/key.`,
      );
    throw new TtsError(`Qwen TTS network error: ${String(err).slice(0, 150)}`);
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new TtsError(`Qwen TTS ${res.status}: ${errBody.slice(0, 150)}`);
  }
  const data = (await res.json()) as {
    output?: { audio?: { url?: string; data?: string } };
  };
  const audio = data?.output?.audio;
  if (audio?.data)
    return { bytes: Buffer.from(audio.data, "base64"), ext: "wav" };
  if (audio?.url) {
    let a: Awaited<ReturnType<typeof fetch>>;
    try {
      a = await fetchImpl(audio.url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "TimeoutError" || name === "AbortError")
        throw new TtsError(
          `Qwen TTS audio download timed out after ${TIMEOUT_MS / 1000}s. Check your network and the region/key.`,
        );
      throw new TtsError(
        `Qwen TTS audio download network error: ${String(err).slice(0, 150)}`,
      );
    }
    if (!a.ok) {
      const errBody = await a.text().catch(() => "");
      throw new TtsError(
        `Qwen TTS audio download ${a.status}: ${errBody.slice(0, 150)}`,
      );
    }
    return { bytes: Buffer.from(await a.arrayBuffer()), ext: "wav" };
  }
  throw new TtsError("Qwen TTS: no audio in response");
}
