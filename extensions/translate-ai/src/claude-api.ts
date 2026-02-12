import { type TranslateRequest, type ClaudeApiRequest, type ClaudeApiResponse } from "./types";
import { getTranslationPrompt } from "./prompts";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_API_VERSION = "2023-06-01";
const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

export async function translateText({ text, lang, apiKey }: TranslateRequest): Promise<string> {
  const prompt = getTranslationPrompt(text, lang);

  const requestBody: ClaudeApiRequest = {
    model: CLAUDE_MODEL,
    max_tokens: text.length + 1024,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  };

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": CLAUDE_API_VERSION,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as ClaudeApiResponse;

  if (data.content && data.content.length > 0) {
    return data.content[0].text;
  }

  throw new Error("No translation returned from Claude API");
}
