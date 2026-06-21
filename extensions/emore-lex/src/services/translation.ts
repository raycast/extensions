import { Definition } from "../types/word";

type MyMemoryResponse = {
  responseData?: {
    translatedText?: string;
  };
};

type TranslationResult = {
  definitions: Definition[];
  cacheable: boolean;
};

type TranslateTextResult = {
  text?: string;
  cacheable: boolean;
};

const MAX_TRANSLATION_TEXT_LENGTH = 400;

export async function translateDefinitions(
  definitions: Definition[],
  signal?: AbortSignal,
): Promise<TranslationResult> {
  const translatedDefinitions: Definition[] = [];
  let cacheable = true;

  for (const definition of definitions) {
    const translation = await translateToChinese(definition.english, signal);
    if (!translation.cacheable) cacheable = false;
    translatedDefinitions.push(translation.text ? { ...definition, chinese: translation.text } : definition);
  }

  return { definitions: translatedDefinitions, cacheable };
}

export async function translateToChinese(text: string, signal?: AbortSignal): Promise<TranslateTextResult> {
  const normalizedText = normalizeTranslationText(text);
  if (!normalizedText) return { cacheable: true };

  try {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", normalizedText);
    url.searchParams.set("langpair", "en|zh-CN");

    const response = await fetch(url, { signal });
    if (!response.ok) return { cacheable: !isTransientStatus(response.status) };

    const data = (await response.json()) as MyMemoryResponse;
    const translatedText = data.responseData?.translatedText?.trim();
    if (!translatedText || translatedText.toLowerCase() === normalizedText.toLowerCase()) return { cacheable: true };

    return { text: translatedText, cacheable: true };
  } catch (error) {
    if (isAbortError(error)) throw error;
    return { cacheable: false };
  }
}

function normalizeTranslationText(text: string): string {
  return text.trim().slice(0, MAX_TRANSLATION_TEXT_LENGTH);
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
