import { SpeechCreateParams } from "openai/resources/audio/speech";

export interface Preferences {
  openaiApiKey: string;
  model: SpeechCreateParams["model"];
  voice: SpeechCreateParams["voice"];
  speed?: string;
  instructions?: string;
  response_format: SpeechCreateParams["response_format"];
  saveAudioFiles?: boolean;
}

export type SupportedVoice =
  | "alloy"
  | "ash"
  | "ballad"
  | "coral"
  | "echo"
  | "fable"
  | "nova"
  | "onyx"
  | "sage"
  | "shimmer";
