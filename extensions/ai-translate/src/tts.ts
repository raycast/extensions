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

const QWEN_TTS_DEFAULT_MODEL = "qwen3-tts-flash";
const QWEN_TTS_INSTRUCT_MODEL = "qwen3-tts-instruct-flash";
const QWEN_TTS_DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/api/v1";
const QWEN_TTS_DEFAULT_VOICE = "Cherry";
const QWEN_TTS_DEFAULT_LANGUAGE_TYPE = "Auto";
const QWEN_TTS_MAX_CHARS = 550;
const QWEN_TTS_SOFT_CHARS = 420;
const TTS_REQUEST_TIMEOUT_MS = 30_000;

const GEMINI_SAMPLE_RATE = 24000;
const PCM_CHANNELS = 1;
const PCM_BITS_PER_SAMPLE = 16;

type QwenTTSModel = typeof QWEN_TTS_DEFAULT_MODEL | typeof QWEN_TTS_INSTRUCT_MODEL;
type QwenTTSLanguageType = "Auto" | "Chinese" | "English" | "German";

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

interface QwenTTSResponse {
  output?: {
    audio?: {
      data?: string;
      url?: string;
      id?: string;
      expires_at?: number;
    };
    finish_reason?: string;
  };
  code?: string | number;
  message?: string;
  request_id?: string;
}

export async function speakText(text: string, options: SpeakOptions = {}): Promise<void> {
  const trimmed = text.trim().slice(0, 5000);
  if (!trimmed) return;

  const preferences = getPreferenceValues<Preferences>();
  const { ttsProvider } = await loadRuntimeSettings();
  const slow = Boolean(options.slow);
  const chunks = ttsProvider === "qwen" ? splitTextForQwen(trimmed) : [trimmed];

  stopSpeaking();
  void sweepStaleAudio();

  const slowIsSupported =
    !slow || ttsProvider !== "qwen" || normalizeQwenModel(preferences.qwenTTSModel) === QWEN_TTS_INSTRUCT_MODEL;
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: slow && slowIsSupported ? "Reading aloud (slow)..." : "Reading aloud...",
  });
  const controller = new AbortController();
  activeController = controller;

  try {
    for (const chunk of chunks) {
      if (controller.signal.aborted || activeController !== controller) return;

      const timeout = setTimeout(() => controller.abort(), TTS_REQUEST_TIMEOUT_MS);
      let wav: Buffer | undefined;
      try {
        wav =
          ttsProvider === "qwen"
            ? await synthesizeWithQwen(chunk, slow, preferences, controller.signal)
            : await synthesizeWithGemini(chunk, slow, preferences, controller.signal);
      } finally {
        clearTimeout(timeout);
      }

      toast.hide();
      if (!wav) return;
      await playWav(wav, controller.signal);
    }
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

async function synthesizeWithQwen(
  text: string,
  slow: boolean,
  preferences: Preferences,
  signal: AbortSignal,
): Promise<Buffer | undefined> {
  const apiKey = preferences.dashscopeApiKey?.trim() || process.env.DASHSCOPE_API_KEY?.trim();
  if (!apiKey) {
    await showToast({
      style: Toast.Style.Failure,
      title: "TTS Unavailable",
      message: "Add a DashScope API key in preferences or DASHSCOPE_API_KEY",
    });
    return undefined;
  }

  const model = normalizeQwenModel(preferences.qwenTTSModel);
  const voice = preferences.qwenTTSVoice?.trim() || QWEN_TTS_DEFAULT_VOICE;
  const languageType = normalizeQwenLanguageType(preferences.qwenTTSLanguageType);
  const instructions = buildQwenInstructions(model, preferences.qwenTTSInstructions, slow);
  const url = qwenGenerationUrl(preferences.qwenTTSBaseURL);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: {
        text,
        voice,
        language_type: languageType,
        ...(instructions ? { instructions } : {}),
      },
    }),
    signal,
  });

  const responseText = await response.text();
  const data = parseJson<QwenTTSResponse>(responseText);

  if (!response.ok || data.error?.message || data.message || data.code) {
    await showToast({
      style: Toast.Style.Failure,
      title: "TTS Error",
      message:
        data.error?.message?.slice(0, 100) ??
        data.message?.slice(0, 100) ??
        `HTTP ${response.status}: ${responseText.slice(0, 100)}`,
    });
    return undefined;
  }

  const audioBase64 = data.output?.audio?.data || (await fetchQwenAudioUrlAsBase64(data.output?.audio?.url, signal));
  if (!audioBase64) {
    await showToast({ style: Toast.Style.Failure, title: "TTS Error", message: "No audio in response" });
    return undefined;
  }

  return Buffer.from(audioBase64, "base64");
}

async function fetchQwenAudioUrlAsBase64(url: string | undefined, signal: AbortSignal): Promise<string | undefined> {
  if (!url) return undefined;

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Qwen-TTS audio download failed: HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error("Qwen-TTS returned an empty audio file");
  }
  return buffer.toString("base64");
}

function qwenGenerationUrl(baseURL: string | undefined): string {
  const trimmed = (baseURL?.trim() || QWEN_TTS_DEFAULT_BASE_URL).replace(/\/+$/, "");
  if (trimmed.endsWith("/services/aigc/multimodal-generation/generation")) {
    return trimmed;
  }
  return `${trimmed}/services/aigc/multimodal-generation/generation`;
}

function normalizeQwenModel(model: string | undefined): QwenTTSModel {
  return model === QWEN_TTS_INSTRUCT_MODEL ? QWEN_TTS_INSTRUCT_MODEL : QWEN_TTS_DEFAULT_MODEL;
}

function normalizeQwenLanguageType(languageType: string | undefined): QwenTTSLanguageType {
  return languageType === "Chinese" || languageType === "English" || languageType === "German"
    ? languageType
    : QWEN_TTS_DEFAULT_LANGUAGE_TYPE;
}

function buildQwenInstructions(model: QwenTTSModel, preferenceInstructions: string | undefined, slow: boolean): string {
  if (model !== QWEN_TTS_INSTRUCT_MODEL) {
    return "";
  }

  return [
    preferenceInstructions?.trim(),
    slow ? "Read slowly and clearly, enunciating each word like a language teacher helping a learner." : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function splitTextForQwen(text: string): string[] {
  const chunks: string[] = [];
  let current = "";
  let count = 0;

  for (const char of text) {
    current += char;
    count += 1;

    if (count >= QWEN_TTS_MAX_CHARS || (count >= QWEN_TTS_SOFT_CHARS && isSentenceBoundary(char))) {
      const chunk = current.trim();
      if (chunk) chunks.push(chunk);
      current = "";
      count = 0;
    }
  }

  const tail = current.trim();
  if (tail) chunks.push(tail);
  return chunks;
}

function isSentenceBoundary(char: string): boolean {
  return "。！？.!?；;".includes(char);
}

async function playWav(wavData: Buffer, signal?: AbortSignal): Promise<void> {
  await mkdir(environment.supportPath, { recursive: true });
  const audioPath = join(environment.supportPath, `tts-${Date.now()}-${Math.random().toString(16).slice(2)}.wav`);
  await writeFile(audioPath, wavData);

  if (signal?.aborted) {
    unlink(audioPath, () => undefined);
    throw abortError("Playback aborted");
  }

  await new Promise<void>((resolve, reject) => {
    const child = execFile("/usr/bin/afplay", [audioPath], (error) => {
      signal?.removeEventListener("abort", abortPlayback);
      unlink(audioPath, () => undefined);
      if (activePlayback === child) {
        activePlayback = undefined;
      }
      if (error && !error.killed) {
        void showHUD(`Playback error: ${error.message.slice(0, 60)}`);
        reject(error);
        return;
      }
      resolve();
    });

    function abortPlayback() {
      child.kill();
    }

    activePlayback = child;
    signal?.addEventListener("abort", abortPlayback, { once: true });
  });
}

function abortError(message: string): Error {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
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
