import type { TtsConfig, SynthesizeOptions } from "./types";
import { TtsError, type SynthResult } from "./openai";

const TIMEOUT_MS = 60_000;
const DEFAULT_MIMO_TTS_BASE = "https://token-plan-cn.xiaomimimo.com/v1";

/**
 * MiMo (Xiaomi) TTS. Unlike OpenAI/Qwen it rides the OpenAI-compatible
 * `/chat/completions` endpoint: the sentence to speak goes in an `assistant`
 * message, the coaching style instruction in a `user` message, and the audio
 * comes back base64-encoded in `message.audio.data`. The Anthropic-compatible
 * Token Plan messages endpoint does not return audio for this model, so TTS
 * uses the matching OpenAI-compatible Token Plan `/v1` endpoint.
 */
export async function synthesizeMimo(
  text: string,
  opts: SynthesizeOptions,
  cfg: TtsConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SynthResult> {
  const base = cfg.baseURL ?? DEFAULT_MIMO_TTS_BASE;
  const body = {
    model: cfg.model, // mimo-v2.5-tts
    messages: [
      { role: "user", content: opts.instructions },
      { role: "assistant", content: text },
    ],
    audio: { format: "wav", voice: cfg.voice },
  };

  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetchImpl(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": cfg.apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError")
      throw new TtsError(
        `MiMo TTS timed out after ${TIMEOUT_MS / 1000}s. Check your network, base URL, and key.`,
      );
    throw new TtsError(`MiMo TTS network error: ${String(err).slice(0, 150)}`);
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new TtsError(`MiMo TTS ${res.status}: ${errBody.slice(0, 150)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { audio?: { data?: string } } }[];
  };
  const b64 = data?.choices?.[0]?.message?.audio?.data;
  if (!b64) throw new TtsError("MiMo TTS: no audio in response");
  return { bytes: Buffer.from(b64, "base64"), ext: "wav" };
}
