import { environment, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { mkdirSync, unlink, writeFileSync } from "fs";
import { join } from "path";

const TTS_MODEL = "gemini-3.1-flash-tts-preview";
const TTS_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const SAMPLE_RATE = 24000;
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

interface GeminiTTSResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }>;
    };
  }>;
  error?: {
    message?: string;
    status?: string;
  };
}

export async function speakText(text: string): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.geminiAPIKey?.trim();

  if (!apiKey) {
    await showToast({
      style: Toast.Style.Failure,
      title: "TTS Unavailable",
      message: "Add a Gemini API key in preferences",
    });
    return;
  }

  const trimmed = text.trim().slice(0, 5000);
  if (!trimmed) return;

  const toast = await showToast({ style: Toast.Style.Animated, title: "Reading aloud..." });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(`${TTS_BASE_URL}/models/${TTS_MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: trimmed }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
        },
      }),
      signal: controller.signal,
    });

    const responseText = await response.text();
    const data = parseGeminiTTSResponse(responseText);

    if (!response.ok || data.error?.message) {
      toast.hide();
      await showToast({
        style: Toast.Style.Failure,
        title: "TTS Error",
        message: data.error?.message?.slice(0, 100) ?? `HTTP ${response.status}: ${responseText.slice(0, 100)}`,
      });
      return;
    }

    const audioBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) {
      toast.hide();
      await showToast({ style: Toast.Style.Failure, title: "TTS Error", message: "No audio in response" });
      return;
    }

    const pcmData = Buffer.from(audioBase64, "base64");
    const wavData = wrapPCMInWAV(pcmData);

    mkdirSync(environment.supportPath, { recursive: true });
    const audioPath = join(environment.supportPath, `tts-${Date.now()}-${Math.random().toString(16).slice(2)}.wav`);
    writeFileSync(audioPath, wavData);

    execFile("/usr/bin/afplay", [audioPath], (error) => {
      unlink(audioPath, () => undefined);
      if (error && !error.killed) {
        void showHUD(`Playback error: ${error.message.slice(0, 60)}`);
      }
    });

    toast.hide();
  } catch (error) {
    toast.hide();
    if (error instanceof Error && error.name === "AbortError") {
      await showToast({ style: Toast.Style.Failure, title: "TTS Timeout", message: "Request took too long" });
      return;
    }
    const msg = error instanceof Error ? error.message : String(error);
    await showToast({ style: Toast.Style.Failure, title: "TTS Failed", message: msg.slice(0, 100) });
  } finally {
    clearTimeout(timeout);
  }
}

function parseGeminiTTSResponse(text: string): GeminiTTSResponse {
  try {
    return JSON.parse(text) as GeminiTTSResponse;
  } catch {
    return { error: { message: text ? `Invalid response: ${text.slice(0, 100)}` : "Empty response" } };
  }
}

function wrapPCMInWAV(pcmData: Buffer): Buffer {
  const byteRate = SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(NUM_CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}
