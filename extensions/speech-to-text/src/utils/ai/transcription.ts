import Groq from "groq-sdk";
import fs from "fs-extra";
import { getPreferenceValues } from "@raycast/api";
import { TranscriptionModelId, TranscriptionResult } from "../../types";
import { buildCompletePrompt } from "../../constants";
import path from "path";

function isTranscriptionResult(data: unknown): data is TranscriptionResult {
  if (!data || typeof data !== "object") return false;

  const result = data as Partial<TranscriptionResult>;
  return (
    typeof result.text === "string" &&
    typeof result.timestamp === "string" &&
    typeof result.audioFile === "string" &&
    (result.language === undefined || typeof result.language === "string") &&
    (result.prompt === undefined || typeof result.prompt === "string") &&
    typeof result.model === "string"
  );
}

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

    try {
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

      const response = await client.audio.transcriptions.create(transcriptionOptions);

      const result: TranscriptionResult = {
        text: response.text.trim(),
        timestamp: new Date().toISOString(),
        audioFile: filePath,
        language: language,
        prompt: prompt,
        model: model,
      };

      await saveTranscription(filePath, result);
      return result;
    } finally {
      fileBuffer.destroy();
    }
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
}

export async function saveTranscription(
  audioFilePath: string,
  transcriptionData: TranscriptionResult,
): Promise<string> {
  const parsedPath = path.parse(audioFilePath);
  const transcriptionFilePath = path.format({
    dir: parsedPath.dir,
    name: parsedPath.name,
    ext: ".json",
  });

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
  const parsedPath = path.parse(audioFilePath);
  const transcriptionFilePath = path.format({
    dir: parsedPath.dir,
    name: parsedPath.name,
    ext: ".json",
  });

  try {
    if (await fs.pathExists(transcriptionFilePath)) {
      const data = await fs.readJSON(transcriptionFilePath);
      if (!isTranscriptionResult(data)) {
        console.error(`Invalid transcription data format in ${transcriptionFilePath}`);
        return null;
      }
      return data;
    }
    return null;
  } catch (error) {
    console.error(`Error loading transcription for ${audioFilePath}:`, error);
    return null;
  }
}
