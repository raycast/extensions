import { environment, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { ChildProcess, execFile } from "node:child_process";
import { unlink } from "node:fs";
import { mkdir, readdir, stat, unlink as unlinkAsync, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadRuntimeSettings } from "./runtime-settings";

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

const GEMINI_TTS_MODEL = "gemini-3.1-flash-tts-preview";
const GEMINI_TTS_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_DEFAULT_VOICE = "Kore";

const MIMO_TTS_MODEL = "mimo-v2.5-tts";
const MIMO_TTS_DEFAULT_BASE_URL = "https://token-plan-cn.xiaomimimo.com/v1";
const MIMO_TTS_DEFAULT_VOICE = "mimo_default";

const GEMINI_SAMPLE_RATE = 24000;
const PCM_CHANNELS = 1;
const PCM_BITS_PER_SAMPLE = 16;

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

interface MimoTTSResponse {
  choices?: Array<{
    message?: {
      audio?: {
        data?: string;
        format?: string;
      };
    };
  }>;
  error?: {
    message?: string;
    type?: string;
  };
}

export async function speakText(text: string, options: SpeakOptions = {}): Promise<void> {
  const trimmed = text.trim().slice(0, 5000);
  if (!trimmed) return;

  const preferences = getPreferenceValues<Preferences>();
  const { ttsProvider } = await loadRuntimeSettings();
  const slow = Boolean(options.slow);

  stopSpeaking();
  void sweepStaleAudio();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: slow ? "Reading aloud (slow)..." : "Reading aloud...",
  });
  const controller = new AbortController();
  activeController = controller;
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const wav =
      ttsProvider === "mimo"
        ? await synthesizeWithMimo(trimmed, slow, preferences, controller.signal)
        : await synthesizeWithGemini(trimmed, slow, preferences, controller.signal);
    toast.hide();
    if (!wav) return;
    await playWav(wav);
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

async function synthesizeWithGemini(
  text: string,
  slow: boolean,
  preferences: Preferences,
  signal: AbortSignal,
): Promise<Buffer | undefined> {
  const apiKey = preferences.geminiAPIKey?.trim();
  if (!apiKey) {
    await showToast({
      style: Toast.Style.Failure,
      title: "TTS Unavailable",
      message: "Add a Gemini API key in preferences",
    });
    return undefined;
  }

  const voiceName = preferences.geminiTTSVoice?.trim() || GEMINI_DEFAULT_VOICE;
  const spokenText = slow
    ? `Read the following slowly and clearly, enunciating each word like a language teacher helping a learner: ${text}`
    : text;

  const response = await fetch(`${GEMINI_TTS_BASE_URL}/models/${GEMINI_TTS_MODEL}:generateContent`, {
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
    signal,
  });

  const responseText = await response.text();
  const data = parseJson<GeminiTTSResponse>(responseText);

  if (!response.ok || data.error?.message) {
    await showToast({
      style: Toast.Style.Failure,
      title: "TTS Error",
      message: data.error?.message?.slice(0, 100) ?? `HTTP ${response.status}: ${responseText.slice(0, 100)}`,
    });
    return undefined;
  }

  const audioBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioBase64) {
    await showToast({ style: Toast.Style.Failure, title: "TTS Error", message: "No audio in response" });
    return undefined;
  }

  return wrapPCMInWAV(Buffer.from(audioBase64, "base64"), GEMINI_SAMPLE_RATE);
}

async function synthesizeWithMimo(
  text: string,
  slow: boolean,
  preferences: Preferences,
  signal: AbortSignal,
): Promise<Buffer | undefined> {
  const apiKey = preferences.mimoAPIKey?.trim();
  if (!apiKey) {
    await showToast({
      style: Toast.Style.Failure,
      title: "TTS Unavailable",
      message: "Add a Xiaomi MiMo API key in preferences",
    });
    return undefined;
  }

  const baseURL = preferences.mimoTTSBaseURL?.trim() || MIMO_TTS_DEFAULT_BASE_URL;
  const voice = preferences.mimoTTSVoice?.trim() || MIMO_TTS_DEFAULT_VOICE;
  const url = `${baseURL.replace(/\/+$/, "")}/chat/completions`;

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (slow) {
    messages.push({ role: "user", content: "请放慢语速、咬字清晰地朗读，像语言老师帮助初学者那样。" });
  }
  messages.push({ role: "assistant", content: text });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MIMO_TTS_MODEL,
      messages,
      audio: { format: "wav", voice },
      stream: false,
    }),
    signal,
  });

  const responseText = await response.text();
  const data = parseJson<MimoTTSResponse>(responseText);

  if (!response.ok || data.error?.message) {
    await showToast({
      style: Toast.Style.Failure,
      title: "TTS Error",
      message: data.error?.message?.slice(0, 100) ?? `HTTP ${response.status}: ${responseText.slice(0, 100)}`,
    });
    return undefined;
  }

  const audioBase64 = data.choices?.[0]?.message?.audio?.data;
  if (!audioBase64) {
    await showToast({ style: Toast.Style.Failure, title: "TTS Error", message: "No audio in response" });
    return undefined;
  }

  return Buffer.from(audioBase64, "base64");
}

async function playWav(wavData: Buffer): Promise<void> {
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
}

function parseJson<T>(text: string): T & { error?: { message?: string } } {
  try {
    return JSON.parse(text) as T & { error?: { message?: string } };
  } catch {
    return { error: { message: text ? `Invalid response: ${text.slice(0, 100)}` : "Empty response" } } as T & {
      error?: { message?: string };
    };
  }
}

function wrapPCMInWAV(pcmData: Buffer, sampleRate: number): Buffer {
  const byteRate = sampleRate * PCM_CHANNELS * (PCM_BITS_PER_SAMPLE / 8);
  const blockAlign = PCM_CHANNELS * (PCM_BITS_PER_SAMPLE / 8);
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(PCM_CHANNELS, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(PCM_BITS_PER_SAMPLE, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}
