export enum Provider {
  OPENAI = "OpenAI",
  ANTHROPIC = "Anthropic",
  GEMINI = "Google Gemini",
}

export type Config = {
  apiKey: string;
  provider: Provider;
};
