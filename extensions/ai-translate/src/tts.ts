import { environment, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { ChildProcess, execFile } from "node:child_process";
import { unlink } from "node:fs";
import { mkdir, readdir, stat, unlink as unlinkAsync, writeFile } from "node:fs/promises";
import { join } from "node:path";

const STALE_AUDIO_MS = 10 * 60 * 1000;

/** Remove leftover TTS WAVs from runs that were torn down before afplay finished. */
async function sweepStaleAudio(): Promise<void> {
  try {
    const now = Date.now();
    const files = await readdir(environment.supportPath);
    await Promise.all(
      files
        .filter((name) => name.startsWith("tts-") && name.endsWith(".wav"))
        .map(async (name) => {
          const path = join(environment.supportPath, name);
          try {
            const info = await stat(path);
            if (now - info.mtimeMs > STALE_AUDIO_MS) {
              await unlinkAsync(path);
            }
          } catch {
            // Already gone or unreadable — nothing to clean.
          }
        }),
    );
  } catch {
    // supportPath missing yet — created on first successful run.
  }
}

const TTS_MODEL = "gemini-3.1-flash-tts-preview";
const TTS_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_VOICE = "Kore";

const SAMPLE_RATE = 24000;
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

interface SpeakOptions {
  slow?: boolean;
}

let activePlayback: ChildProcess | undefined;
let activeController: AbortController | undefined;

export function stopSpeaking(): void {
  if (activeController) {
    activeController.abort();
    activeController = undefined;
  }
  if (activePlayback) {
    activePlayback.kill();
    activePlayback = undefined;
  }
}

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

export async function speakText(text: string, options: SpeakOptions = {}): Promise<void> {
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

  stopSpeaking();
  void sweepStaleAudio();

  const voiceName = preferences.geminiTTSVoice?.trim() || DEFAULT_VOICE;
  const spokenText = options.slow
    ? `Read the following slowly and clearly, enunciating each word like a language teacher helping a learner: ${trimmed}`
    : trimmed;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: options.slow ? "Reading aloud (slow)..." : "Reading aloud...",
  });
  const controller = new AbortController();
  activeController = controller;
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(`${TTS_BASE_URL}/models/${TTS_MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: spokenText }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
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

    await mkdir(environment.supportPath, { recursive: true });
    const audioPath = join(environment.supportPath, `tts-${Date.now()}-${Math.random().toString(16).slice(2)}.wav`);
    await writeFile(audioPath, wavData);

    const child = execFile("/usr/bin/afplay", [audioPath], (error) => {
      unlink(audioPath, () => undefined);
      if (activePlayback === child) {
        activePlayback = undefined;
      }
      if (error && !error.killed) {
        void showHUD(`Playback error: ${error.message.slice(0, 60)}`);
      }
    });
    activePlayback = child;

    toast.hide();
  } catch (error) {
    toast.hide();
    if (error instanceof Error && error.name === "AbortError") {
      if (activeController !== controller) return;
      await showToast({ style: Toast.Style.Failure, title: "TTS Timeout", message: "Request took too long" });
      return;
    }
    const msg = error instanceof Error ? error.message : String(error);
    await showToast({ style: Toast.Style.Failure, title: "TTS Failed", message: msg.slice(0, 100) });
  } finally {
    clearTimeout(timeout);
    if (activeController === controller) {
      activeController = undefined;
    }
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
