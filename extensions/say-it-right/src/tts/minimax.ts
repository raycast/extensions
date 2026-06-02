import type { TtsConfig, SynthesizeOptions } from "./types";
import { TtsError, type SynthResult } from "./openai";

const TIMEOUT_MS = 60_000;

interface MinimaxTtsResponse {
  data?: { audio?: string };
  base_resp?: { status_code?: number; status_msg?: string };
}

export async function synthesizeMinimax(
  text: string,
  opts: SynthesizeOptions,
  cfg: TtsConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SynthResult> {
  const base = cfg.baseURL ?? "https://api.minimaxi.com/v1";

  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetchImpl(`${base.replace(/\/+$/, "")}/t2a_v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        text,
        stream: false,
        voice_setting: {
          voice_id: cfg.voice,
          speed: opts.rate,
          vol: 1,
          pitch: 0,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: "mp3",
          channel: 1,
        },
        output_format: "hex",
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError")
      throw new TtsError(
        `MiniMax TTS timed out after ${TIMEOUT_MS / 1000}s. Check your network, base URL, and key.`,
      );
    throw new TtsError(
      `MiniMax TTS network error: ${String(err).slice(0, 150)}`,
    );
  }

  const body = await res.text().catch(() => "");
  if (!res.ok) {
    throw new TtsError(`MiniMax TTS ${res.status}: ${body.slice(0, 150)}`);
  }

  let data: MinimaxTtsResponse;
  try {
    data = JSON.parse(body) as MinimaxTtsResponse;
  } catch {
    throw new TtsError(`MiniMax TTS invalid response: ${body.slice(0, 150)}`);
  }

  const code = data.base_resp?.status_code;
  if (code !== undefined && code !== 0) {
    throw new TtsError(
      data.base_resp?.status_msg ?? `MiniMax TTS error ${code}`,
    );
  }
  const hex = data.data?.audio;
  if (!hex) throw new TtsError("MiniMax TTS: no audio in response");
  return { bytes: Buffer.from(hex, "hex"), ext: "mp3" };
}
