import { log } from "../log";
import { GEMINI_API_BASE } from "./gemini-constants";

export interface GeminiOptions {
  text: string;
  apiKey: string;
  model: string;
  prompt: string;
}

function parseGeminiSSE(body: string): string {
  let result = "";

  for (const line of body.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const data = line.slice(6).trim();
    if (data === "[DONE]") break;
    try {
      const event = JSON.parse(data);
      const parts = event?.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (typeof part.text === "string") {
            result += part.text;
          }
        }
      }
    } catch {
      // skip
    }
  }

  return result;
}

export async function geminiGrammarCheck(options: GeminiOptions): Promise<string> {
  const { text, apiKey, model, prompt } = options;
  const url = `${GEMINI_API_BASE}/models/${model}:streamGenerateContent?alt=sse`;

  log(`Calling Gemini API... model: ${model}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: prompt }],
      },
      contents: [
        {
          parts: [{ text }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    log(`Gemini API error (${response.status}): ${err}`);
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  const body = await response.text();
  const result = parseGeminiSSE(body);

  log(`Gemini stream complete, result length: ${result.length}`);
  if (!result) throw new Error("Empty response from Gemini");

  return result;
}
