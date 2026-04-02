import {
  GeminiApiResponseSchema,
  GeminiWordResponse,
  GeminiWordResponseSchema,
  GeminiTextResponse,
  GeminiTextResponseSchema,
  WordSense,
} from "./types";
import { asJsonStringLiteral, normalizeWordInput, normalizeTextInput } from "./input";
import { LanguagePair } from "./languages";

const MODEL = "gemini-2.5-flash-lite";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

async function callGemini(prompt: string, apiKey: string, signal?: AbortSignal): Promise<string> {
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

  const apiData = GeminiApiResponseSchema.parse(await response.json());
  const raw = apiData.candidates[0]?.content.parts[0]?.text ?? "";

  if (!raw) {
    throw new Error("GEMINI_EMPTY_RESPONSE");
  }

  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

/** Same translation + part of speech = same sense, regardless of example wording. */
function senseIdentityKey(s: WordSense): string {
  return [s.translation.trim().toLowerCase(), s.partOfSpeech.trim().toLowerCase()].join("\u0001");
}

function dedupeSenses(senses: WordSense[]): WordSense[] {
  const seen = new Set<string>();
  const out: WordSense[] = [];
  for (const sense of senses) {
    const key = senseIdentityKey(sense);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(sense);
  }
  return out;
}

export async function translateWord(
  word: string,
  apiKey: string,
  languagePair: LanguagePair,
  signal?: AbortSignal,
): Promise<GeminiWordResponse> {
  const normalizedWord = normalizeWordInput(word);
  if (!normalizedWord) {
    throw new Error("INVALID_WORD_INPUT");
  }

  const { source, target } = languagePair;

  const prompt = `Translate the ${source.name} word ${asJsonStringLiteral(normalizedWord)} to ${target.name}.
If the input is a misspelling or typo, correct it and translate the corrected word.
Provide up to 5 distinct meanings (senses), ordered from most common first.
Each sense MUST have a different translation or a different part of speech — do NOT repeat the same translation+partOfSpeech pair.
If the word has only one meaning, return exactly one sense.
Each sense must have its own example sentence in ${target.name} and the example's translation in ${source.name}.
Respond ONLY with valid JSON:
{
  "senses": [
    {
      "translation": "${target.name} gloss for this sense",
      "partOfSpeech": "noun/verb/adjective/etc",
      "example": "${target.name} example using this sense",
      "exampleTranslation": "${source.name} translation of the example"
    }
  ],
  "correctedWord": "include ONLY if the input was misspelled; omit if correct"
}`;

  const cleaned = await callGemini(prompt, apiKey, signal);

  try {
    const parsed = GeminiWordResponseSchema.parse(JSON.parse(cleaned));
    return { ...parsed, senses: dedupeSenses(parsed.senses) };
  } catch {
    throw new Error("GEMINI_INVALID_RESPONSE");
  }
}

export async function translateText(
  text: string,
  apiKey: string,
  languagePair: LanguagePair,
  signal?: AbortSignal,
): Promise<GeminiTextResponse> {
  const normalizedText = normalizeTextInput(text);
  if (!normalizedText) {
    throw new Error("INVALID_TEXT_INPUT");
  }

  const { source, target } = languagePair;

  const prompt = `Translate the following ${source.name} text to ${target.name}.
Respond ONLY with valid JSON:
{ "translation": "..." }

Text: ${asJsonStringLiteral(normalizedText)}`;

  const cleaned = await callGemini(prompt, apiKey, signal);

  try {
    return GeminiTextResponseSchema.parse(JSON.parse(cleaned));
  } catch {
    throw new Error("GEMINI_INVALID_RESPONSE");
  }
}
