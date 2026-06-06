import type { TtsConfig, SynthesizeOptions } from "./types";

export class TtsError extends Error {}

export interface SynthResult {
  bytes: Buffer;
  ext: string;
}

const TIMEOUT_MS = 60_000;

export async function synthesizeOpenAI(
  text: string,
  opts: SynthesizeOptions,
  cfg: TtsConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SynthResult> {
  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetchImpl("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        voice: cfg.voice,
        input: text,
        instructions: opts.instructions,
        response_format: "wav",
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError")
      throw new TtsError(
        `OpenAI TTS timed out after ${TIMEOUT_MS / 1000}s. Check your network and the region/key.`,
      );
    throw new TtsError(
      `OpenAI TTS network error: ${String(err).slice(0, 150)}`,
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TtsError(`OpenAI TTS ${res.status}: ${body.slice(0, 150)}`);
  }
  return { bytes: Buffer.from(await res.arrayBuffer()), ext: "wav" };
}
