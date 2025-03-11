import Groq from "groq-sdk";
import fs from "fs-extra";
import { getPreferenceValues } from "@raycast/api";
import { Preferences, TranscriptionModelId, TranscriptionResult } from "../../types";
import { buildCompletePrompt } from "../../constants";

export async function transcribeAudio(
  filePath: string,
  options?: {
    overrideLanguage?: string;
    overridePrompt?: string;
    overrideModel?: TranscriptionModelId;
    promptOptions?: {
      promptText?: string;
      userTerms?: string;
      highlightedText?: string;
    };
  },
): Promise<TranscriptionResult> {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.apiKey) {
    throw new Error("Groq API key is not set. Please set it in the extension preferences.");
  }

  try {
    const client = new Groq({
      apiKey: preferences.apiKey,
    });

    const fileBuffer = fs.createReadStream(filePath);

    const model = options?.overrideModel ?? preferences.model;

    const transcriptionOptions: {
      file: fs.ReadStream;
      model: TranscriptionModelId;
      response_format: "verbose_json" | "json" | "text";
      language?: string;
      prompt?: string;
    } = {
      file: fileBuffer,
      model: model,
      response_format: "verbose_json",
    };

    const language = options?.overrideLanguage ?? preferences.language;

    if (language && language !== "auto") {
      transcriptionOptions.language = language;
    }

    const prompt =
      options?.overridePrompt ??
      buildCompletePrompt(
        options?.promptOptions?.promptText ?? preferences.promptText,
        options?.promptOptions?.userTerms ?? preferences.userTerms,
        options?.promptOptions?.highlightedText,
      );

    if (prompt && prompt.trim() !== "") {
      transcriptionOptions.prompt = prompt;
    }

    const transcription = await client.audio.transcriptions.create(transcriptionOptions);

    const result: TranscriptionResult = {
      text: transcription.text.trim(),
      timestamp: new Date().toISOString(),
      audioFile: filePath,
      language: language,
      prompt: prompt,
      model: model,
    };

    await saveTranscription(filePath, result);

    return result;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("rate limit") ||
        error.message.includes("429") ||
        error.message.includes("too many requests"))
    ) {
      throw new Error("Groq API rate limit exceeded. Please try again later or reduce the length of your audio file.");
    }

    if (error instanceof Error && error.message.includes("400")) {
      throw new Error("The API couldn't process this audio file. It might be corrupted or in an unsupported format.");
    }

    console.error("Transcription error:", error);
    throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function saveTranscription(
  audioFilePath: string,
  transcriptionData: TranscriptionResult,
): Promise<string> {
  const transcriptionFilePath = audioFilePath.replace(/\.[^.]+$/, ".json");

  const dataToSave = {
    ...transcriptionData,
    audioFile: audioFilePath,
  };

  try {
    await fs.writeJSON(transcriptionFilePath, dataToSave, { spaces: 2 });
    return transcriptionFilePath;
  } catch (error) {
    console.error(`Error saving transcription for ${audioFilePath}:`, error);
    throw new Error(`Failed to save transcription: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function loadTranscription(audioFilePath: string): Promise<TranscriptionResult | null> {
  const transcriptionFilePath = audioFilePath.replace(/\.[^.]+$/, ".json");

  try {
    if (await fs.pathExists(transcriptionFilePath)) {
      return await fs.readJSON(transcriptionFilePath);
    }
    return null;
  } catch (error) {
    console.error(`Error loading transcription for ${audioFilePath}:`, error);
    return null;
  }
}
