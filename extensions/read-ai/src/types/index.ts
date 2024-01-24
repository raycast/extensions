import { READING_STYLES_PROMPTS } from "../const/index";
export type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
export type readingStyle = keyof typeof READING_STYLES_PROMPTS;
export type LanguageCode = string;

export interface Preferences {
  apiKey: string;
  defaultVoice: Voice;
  temperature: string;
  gptModel: string;
  subtitlesToggle: boolean;
  outputLanguage: LanguageCode;
  readingStyle: readingStyle;
}
