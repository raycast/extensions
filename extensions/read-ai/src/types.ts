import { READING_STYLES_PROMPTS } from "./const";
export type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
export type readingStyle = keyof typeof READING_STYLES_PROMPTS;
export type LanguageCode = string;
