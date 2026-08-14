import { chooseDirection, languageName, sourceLanguageCode } from "./languages";
import { AppPreferences } from "./preferences";

type DeepLResponse = {
  translations?: Array<{
    detected_source_language?: string;
    text: string;
  }>;
  message?: string;
  error?: {
    message?: string;
  };
};

type Direction = ReturnType<typeof chooseDirection>;

const MAX_TEXT_CHUNK_LENGTH = 4_000;
const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";

function splitLongSegment(segment: string) {
  const chunks: string[] = [];
  let remainingText = segment;

  while (remainingText.length > MAX_TEXT_CHUNK_LENGTH) {
    const newlineIndex = remainingText.lastIndexOf("\n", MAX_TEXT_CHUNK_LENGTH);
    const sentenceIndexes = [". ", "! ", "? "]
      .map((separator) => {
        const index = remainingText.lastIndexOf(separator, MAX_TEXT_CHUNK_LENGTH);
        return index === -1 ? -1 : index + separator.length;
      })
      .filter((index) => index !== -1);
    const whitespaceIndex = remainingText.lastIndexOf(" ", MAX_TEXT_CHUNK_LENGTH);
    const splitIndex = Math.max(newlineIndex, ...sentenceIndexes, whitespaceIndex);
    const safeSplitIndex = splitIndex > MAX_TEXT_CHUNK_LENGTH * 0.6 ? splitIndex : MAX_TEXT_CHUNK_LENGTH;

    chunks.push(remainingText.slice(0, safeSplitIndex));
    remainingText = remainingText.slice(safeSplitIndex);
  }

  if (remainingText) {
    chunks.push(remainingText);
  }

  return chunks;
}

function splitTextForDeepL(text: string) {
  return text
    .split(/(\n{2,})/)
    .flatMap((segment) => (segment.length > MAX_TEXT_CHUNK_LENGTH ? splitLongSegment(segment) : [segment]))
    .filter((segment) => segment.length > 0);
}

function apiErrorMessage(status: number, payload: DeepLResponse) {
  if (status === 403) return "DeepL rejected the API key. Check it in the extension preferences";
  if (status === 456) return "Your DeepL character quota has been reached";
  if (status === 429) return "DeepL is receiving too many requests. Try again in a moment";
  return payload.message || payload.error?.message || `DeepL API error ${status}`;
}

async function translateChunk(
  text: string,
  preferences: AppPreferences,
  direction: Direction,
  sourceLanguage?: string,
) {
  const body = new URLSearchParams();
  body.set("text", text);
  body.set("target_lang", direction.targetLang);
  if (sourceLanguage) {
    body.set("source_lang", sourceLanguage);
  }

  const response = await fetch(DEEPL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${preferences.apiKey.trim()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(20_000),
  });
  const responseText = await response.text();
  let payload: DeepLResponse;

  try {
    payload = JSON.parse(responseText) as DeepLResponse;
  } catch {
    throw new Error(`DeepL returned an invalid response (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(apiErrorMessage(response.status, payload));
  }

  const translatedText = payload.translations?.[0]?.text;
  if (!translatedText) {
    throw new Error("DeepL response did not contain a translation");
  }

  return {
    translatedText,
    sourceLang: payload.translations?.[0]?.detected_source_language,
  };
}

export async function translate(text: string, preferences: AppPreferences) {
  let direction = chooseDirection(text, preferences.primaryLanguage, preferences.secondaryLanguage);
  const chunks = splitTextForDeepL(text);

  async function translateChunks(activeDirection: Direction, sourceLanguage?: string) {
    const translatedChunks: string[] = [];
    let detectedSourceLang: string | undefined;

    for (const chunk of chunks) {
      if (!chunk.trim()) {
        translatedChunks.push(chunk);
        continue;
      }

      const translatedChunk = await translateChunk(chunk, preferences, activeDirection, sourceLanguage);
      translatedChunks.push(translatedChunk.translatedText);
      detectedSourceLang ||= translatedChunk.sourceLang;
    }

    return { translatedText: translatedChunks.join(""), sourceLang: detectedSourceLang };
  }

  let result = await translateChunks(direction);
  const primarySource = sourceLanguageCode(preferences.primaryLanguage);
  const secondarySource = sourceLanguageCode(preferences.secondaryLanguage);
  const detectedSource = sourceLanguageCode(result.sourceLang || "");

  if (direction.isUncertain && detectedSource === primarySource) {
    direction = {
      targetLang: preferences.secondaryLanguage,
      rule: `DeepL detected ${languageName(primarySource)} → ${languageName(preferences.secondaryLanguage)}`,
      isUncertain: false,
    };
    result = await translateChunks(direction, primarySource);
  } else if (direction.isUncertain && detectedSource !== secondarySource) {
    direction = {
      ...direction,
      rule: `Short text treated as ${languageName(secondarySource)} → ${languageName(preferences.primaryLanguage)}`,
      isUncertain: false,
    };
    result = await translateChunks(direction, secondarySource);
  }

  return {
    targetLang: direction.targetLang,
    rule: direction.rule,
    ...result,
  };
}
