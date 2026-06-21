import { Definition } from "../types/word";

type MyMemoryResponse = {
  responseData?: {
    translatedText?: string;
  };
};

export async function translateDefinitions(definitions: Definition[], signal?: AbortSignal): Promise<Definition[]> {
  const translatedDefinitions = await Promise.all(
    definitions.map(async (definition) => {
      const chinese = await translateToChinese(definition.english, signal);
      return chinese ? { ...definition, chinese } : definition;
    }),
  );

  return translatedDefinitions;
}

export async function translateToChinese(text: string, signal?: AbortSignal): Promise<string | undefined> {
  const normalizedText = text.trim();
  if (!normalizedText) return undefined;

  try {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", normalizedText);
    url.searchParams.set("langpair", "en|zh-CN");

    const response = await fetch(url, { signal });
    if (!response.ok) return undefined;

    const data = (await response.json()) as MyMemoryResponse;
    const translatedText = data.responseData?.translatedText?.trim();
    if (!translatedText || translatedText.toLowerCase() === normalizedText.toLowerCase()) return undefined;

    return translatedText;
  } catch (error) {
    if (isAbortError(error)) throw error;
    return undefined;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
