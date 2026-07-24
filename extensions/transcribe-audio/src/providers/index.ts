import { TranscriptionOptions, TranscriptionResult, ProviderError } from "../types";
import { transcribeWithOpenAI } from "./openai";
import { transcribeWithDeepgram } from "./deepgram";
import { transcribeWithElevenLabs } from "./elevenlabs";

export async function transcribe(options: TranscriptionOptions): Promise<TranscriptionResult> {
  switch (options.provider) {
    case "openai":
      return transcribeWithOpenAI(options);
    case "deepgram":
      return transcribeWithDeepgram(options);
    case "elevenlabs":
      return transcribeWithElevenLabs(options);
    default:
      throw new ProviderError(`Unknown provider: ${options.provider}`, options.provider);
  }
}
