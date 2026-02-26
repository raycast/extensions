import {
  GeminiApiResponseSchema,
  GeminiResponse,
  GeminiResponseSchema,
} from "./types";
import { asJsonStringLiteral, normalizeWordInput } from "./input";

const MODEL = "gemini-2.5-flash-lite";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export async function translateWord(
  word: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<GeminiResponse> {
  const normalizedWord = normalizeWordInput(word);
  if (!normalizedWord) {
    throw new Error("INVALID_WORD_INPUT");
  }

  const prompt = `Translate the English word ${asJsonStringLiteral(normalizedWord)} to Ukrainian.
Respond ONLY with valid JSON in this exact format:
{
  "translation": "Ukrainian word",
  "partOfSpeech": "noun/verb/adjective/etc",
  "example": "Ukrainian example sentence",
  "exampleTranslation": "English translation of the example"
}`;

  const url = `${BASE_URL}/${MODEL}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
    signal,
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error("INVALID_API_KEY");
  }

  if (!response.ok) {
    throw new Error("GEMINI_REQUEST_FAILED");
  }

  // Validate the outer Gemini API response shape
  const apiData = GeminiApiResponseSchema.parse(await response.json());
  const raw = apiData.candidates[0]?.content.parts[0]?.text ?? "";

  if (!raw) {
    throw new Error("GEMINI_EMPTY_RESPONSE");
  }

  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    // Validate the translation JSON shape
    return GeminiResponseSchema.parse(JSON.parse(cleaned));
  } catch {
    throw new Error("GEMINI_INVALID_RESPONSE");
  }
}
