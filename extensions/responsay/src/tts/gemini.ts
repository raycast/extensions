import type { TtsConfig, SynthesizeOptions } from "./types";
import { TtsError, type SynthResult } from "./openai";

const TIMEOUT_MS = 60_000;
const SAMPLE_RATE = 24_000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

interface GeminiTtsResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ inlineData?: { data?: string } }> };
  }>;
  error?: { message?: string };
}

export async function synthesizeGemini(
  text: string,
  opts: SynthesizeOptions,
  cfg: TtsConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SynthResult> {
  const base =
    cfg.baseURL ?? "https://generativelanguage.googleapis.com/v1beta";
  const prompt = `${opts.instructions}\n\nText to read:\n${text}`;

  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetchImpl(
      `${base.replace(/\/+$/, "")}/models/${encodeURIComponent(cfg.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": cfg.apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: cfg.voice },
              },
            },
          },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError")
      throw new TtsError(
        `Gemini TTS timed out after ${TIMEOUT_MS / 1000}s. Check your network and key.`,
      );
    throw new TtsError(
      `Gemini TTS network error: ${String(err).slice(0, 150)}`,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TtsError(`Gemini TTS ${res.status}: ${body.slice(0, 150)}`);
  }
  const data = (await res.json()) as GeminiTtsResponse;
  const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) {
    throw new TtsError(
      data.error?.message ?? "Gemini TTS: no audio in response",
    );
  }
  return { bytes: wrapPcmInWav(Buffer.from(b64, "base64")), ext: "wav" };
}

function wrapPcmInWav(pcmData: Buffer): Buffer {
  const byteRate = SAMPLE_RATE * CHANNELS * (BITS_PER_SAMPLE / 8);
  const blockAlign = CHANNELS * (BITS_PER_SAMPLE / 8);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmData.length, 40);
  return Buffer.concat([header, pcmData]);
}
