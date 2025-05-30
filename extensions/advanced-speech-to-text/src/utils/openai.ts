import OpenAI from "openai";
import { createReadStream } from "fs";
import { getPreferenceValues } from "@raycast/api";
import { ErrorTypes, Preferences, DetailedTranscriptionResult } from "../types";
import { getErrorMessage, isOpenAIError, createErrorMessage } from "./errors";

export async function transcribeAudioDetailed(
  filePath: string,
): Promise<DetailedTranscriptionResult> {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.openaiApiKey) {
    throw new Error(ErrorTypes.API_KEY_MISSING);
  }

  const openai = new OpenAI({
    apiKey: preferences.openaiApiKey,
  });

  try {
    const audioFile = createReadStream(filePath);

    const transcription = await createTranscription(
      openai,
      audioFile,
      preferences,
    );

    // Since we always use text format, response will be a string
    if (typeof transcription === "string") {
      return {
        text: transcription.trim(),
        format: "text",
      };
    }

    throw new Error("Unexpected response format from OpenAI");
  } catch (error) {
    console.error("OpenAI transcription error:", error);

    if (isOpenAIError(error)) {
      throw new Error(ErrorTypes.TRANSCRIPTION_FAILED);
    }

    throw new Error(
      createErrorMessage(
        ErrorTypes.TRANSCRIPTION_FAILED,
        getErrorMessage(error),
      ),
    );
  }
}

export async function transcribeAudio(filePath: string): Promise<string> {
  const result = await transcribeAudioDetailed(filePath);
  return result.text;
}

function createTranscription(
  openai: OpenAI,
  audioFile: ReturnType<typeof createReadStream>,
  preferences: Preferences,
) {
  const temperature = preferences.temperature
    ? parseFloat(preferences.temperature)
    : 0;

  return openai.audio.transcriptions.create({
    file: audioFile,
    model: preferences.model || "whisper-1",
    language:
      preferences.language === "auto" ? undefined : preferences.language,
    prompt: preferences.prompt?.trim() || undefined,
    response_format: "text",
    temperature: temperature,
  });
}
