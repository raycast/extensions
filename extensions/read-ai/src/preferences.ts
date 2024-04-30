export type VoiceChoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export interface Preferences {
  apiKey: string;
  defaultVoice: VoiceChoice;
  directRead: boolean;
  gptModel: string;
  outputLanguage: string;
  readingStyle: string;
  speed: string;
  subtitlesToggle: boolean;
  temperature: string;
}
