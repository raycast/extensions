import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { isLoopbackHostname, type OpenAICompatiblePreferences } from "./openai-compatible.ts";

export const TRANSCRIPTION_MODEL = "gpt-4o-transcribe";
export const TRANSCRIPTION_PROMPT =
  "Transcribe the speech faithfully in its original language. Preserve punctuation, capitalization, names, URLs, and technical terms.";
const TRANSCRIPTION_TIMEOUT_MS = 120_000;

interface TranscriptionPayload {
  text?: string;
  error?: {
    message?: string;
  };
}

export class TranscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranscriptionError";
  }
}

export async function transcribeAudioFile(filePath: string, preferences: OpenAICompatiblePreferences): Promise<string> {
  const apiKey = preferences.apiKey.trim();
  if (!apiKey) {
    throw new TranscriptionError("Configure the OpenAI API key in the extension preferences.");
  }

  const endpoint = buildAudioTranscriptionsUrl(preferences.baseUrl);
  let audio: Buffer;

  try {
    audio = await readFile(filePath);
  } catch (error) {
    throw new TranscriptionError(`Could not read the recorded audio: ${errorMessage(error)}`);
  }

  const form = new FormData();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };

  form.set("model", TRANSCRIPTION_MODEL);
  form.set("response_format", "json");
  form.set("prompt", TRANSCRIPTION_PROMPT);
  form.set("file", new Blob([new Uint8Array(audio)], { type: "audio/wav" }), basename(filePath));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);
  let response: Response;
  let responseText: string;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: form,
      signal: controller.signal,
    });
    responseText = await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new TranscriptionError("The transcription took longer than two minutes.");
    }

    throw new TranscriptionError(`Could not reach the transcription API: ${errorMessage(error)}`);
  } finally {
    clearTimeout(timeout);
  }

  const payload = parsePayload(responseText);
  if (!response.ok) {
    const providerMessage = payload?.error?.message ?? compactResponse(responseText);
    throw new TranscriptionError(`The transcription API returned status ${response.status}: ${providerMessage}`);
  }

  const transcript = payload?.text?.trim();
  if (!transcript) {
    throw new TranscriptionError("The API did not recognize any speech in the recording.");
  }

  return transcript;
}

export function buildAudioTranscriptionsUrl(baseUrl: string): string {
  const value = baseUrl.trim();
  if (!value) {
    throw new TranscriptionError("Configure the Base URL in the extension preferences.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TranscriptionError("The configured Base URL is invalid.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TranscriptionError("The Base URL must use HTTP or HTTPS.");
  }

  if (url.protocol === "http:" && !isLoopbackHostname(url.hostname)) {
    throw new TranscriptionError("The Base URL must use HTTPS unless it points to localhost.");
  }

  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = path.endsWith("/audio/transcriptions") ? path : `${path}/audio/transcriptions`;
  url.hash = "";

  return url.toString();
}

function parsePayload(responseText: string): TranscriptionPayload | undefined {
  try {
    return JSON.parse(responseText) as TranscriptionPayload;
  } catch {
    return undefined;
  }
}

function compactResponse(responseText: string): string {
  const compact = responseText.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "response without details";
  }

  return compact.length > 240 ? `${compact.slice(0, 237)}...` : compact;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
