import { SCRIPT_STYLES_PROMPTS } from "../const/index";
export type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
export type ScriptStyle = keyof typeof SCRIPT_STYLES_PROMPTS;
export type LanguageCode = string;

export interface Preferences {
  apiKey: string;
  defaultVoice: Voice;
  temperature: string;
  gptModel: string;
  subtitlesToggle: boolean;
  outputLanguage: LanguageCode;
  scriptStyle: ScriptStyle;
}
