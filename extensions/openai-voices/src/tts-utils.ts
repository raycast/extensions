import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";
import { Preferences } from "./types";

/**
 * Creates speech audio from text using OpenAI TTS API
 * @param text The text to convert to speech
 * @param openaiClient Optional OpenAI client instance (will create one if not provided)
 * @returns Promise resolving to object with audio response and actual format used
 */
export async function createSpeech(text: string, openaiClient?: OpenAI) {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.openaiApiKey) {
    throw new Error("Missing OpenAI API Key");
  }

  const openai =
    openaiClient ||
    new OpenAI({
      apiKey: preferences.openaiApiKey,
    });

  // Parse and clamp speed between 0.25 and 4.0 as per OpenAI limits
  const speedStr = preferences.speed?.trim() || "1.0";
  const parsedSpeed = parseFloat(speedStr);
  const speed = Number.isNaN(parsedSpeed) || parsedSpeed <= 0 ? 1.0 : Math.max(0.25, Math.min(4.0, parsedSpeed));

  const response = await openai.audio.speech.create({
    model: preferences.model,
    voice: preferences.voice,
    input: text,
    speed,
    instructions: preferences.instructions,
    response_format: preferences.response_format || "wav",
  });

  return { audio: response, format: preferences.response_format || "wav" };
}
