import { createReadStream } from "fs";
import { ProviderError, TranscriptionOptions, TranscriptionResult } from "../types";
import { formatMimeType } from "../utils/audio";
import { streamToBuffer } from "../utils/streams";
import { getApiKey, getExtensionPreferences } from "../preferences";

interface OpenAIJsonResponse {
  text: string;
}

export async function transcribeWithOpenAI(options: TranscriptionOptions): Promise<TranscriptionResult> {
  const prefs = getExtensionPreferences();
  const apiKey = getApiKey("openai", prefs);

  const fileBuffer = await streamToBuffer(createReadStream(options.filePath));
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(fileBuffer)], {
      type: formatMimeType(options.filePath, "openai"),
    }),
    options.filePath.split("/").pop() || "audio",
  );
  form.append("model", "gpt-4o-transcribe");

  if (options.language && options.language.trim().length > 0) {
    form.append("language", options.language.trim());
  }

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
    signal: options.signal,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ProviderError(`OpenAI error ${response.status}: ${body}`, "openai");
  }

  const data = (await response.json()) as OpenAIJsonResponse;
  return { text: data.text?.trim() ?? "" };
}
