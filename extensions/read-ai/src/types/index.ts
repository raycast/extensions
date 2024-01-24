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

export type ScriptArguments = {
  type: string;
  title: string;
  short_description: string;
  author_or_source: string;
  script: string;
  output_language: LanguageCode;
};

export interface ScriptOpenAIResponse {
  choices: Array<{
    message: {
      function_call: {
        arguments: ScriptArguments;
      };
    };
  }>;
}

export type ContentType =
  | "literature" // Includes books, novels, poetry, essays, etc.
  | "academic" // Includes research papers, theses, academic articles, etc.
  | "journalism" // Includes news articles, reports, interviews, etc.
  | "correspondence" // Includes letters, emails, memos, etc.
  | "commercial" // Includes advertisements, brochures, business reports, etc.
  | "legal" // Includes legal documents, contracts, legislation, etc.
  | "technical" // Includes technical manuals, guides, documentation, etc.
  | "governmental" // Includes policy documents, public records, etc.
  | "multimedia" // Includes podcasts, presentations, lectures, etc.
  | "social_media" // Includes tweets, blog posts, forum discussions, etc.
  | "other";
