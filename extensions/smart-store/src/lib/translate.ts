import { Cache } from "@raycast/api";
import { useEffect, useState } from "react";
import { createHash } from "node:crypto";
import { z } from "zod";
import { askJSON, getAIStatus } from "./ai";
import { languageName } from "./language";

const cache = new Cache({ namespace: "translations", capacity: 20 * 1024 * 1024 });
const AI_BATCH_SIZE = 40;
/** MyMemory's free tier is small, so without AI only short lists are translated. */
const FREE_LIMIT = 12;

export interface TextToTranslate {
  key: string;
  text: string;
}

function cacheKey(lang: string, text: string) {
  return `${lang}:${createHash("sha1").update(text).digest("hex").slice(0, 16)}`;
}

const TranslationSchema = z.object({
  translations: z.array(z.object({ key: z.string(), text: z.string() })),
});

async function translateWithAI(items: TextToTranslate[], lang: string, signal?: AbortSignal) {
  const result: Record<string, string> = {};
  for (let i = 0; i < items.length; i += AI_BATCH_SIZE) {
    const batch = items.slice(i, i + AI_BATCH_SIZE);
    const prompt = `Translate these Raycast extension descriptions from English into ${languageName(lang)}.
Keep product names, app names, brand names and technical terms as they are. Keep each translation short and natural.
Return one entry per key.

${JSON.stringify(batch)}`;
    const { translations } = await askJSON(prompt, TranslationSchema, signal);
    for (const t of translations) result[t.key] = t.text;
  }
  return result;
}

async function translateWithMyMemory(text: string, lang: string, signal?: AbortSignal): Promise<string | undefined> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 450))}&langpair=en|${lang}`;
  const response = await fetch(url, { signal });
  if (!response.ok) return undefined;
  const data = (await response.json()) as { responseStatus?: number; responseData?: { translatedText?: string } };
  return data.responseStatus === 200 ? data.responseData?.translatedText : undefined;
}

/** Returns translations keyed by item key. Already-translated texts come from the local cache. */
export async function translateTexts(
  items: TextToTranslate[],
  lang: string,
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  if (lang === "en") return result;

  const missing: TextToTranslate[] = [];
  for (const item of items) {
    if (!item.text.trim()) continue;
    const cached = cache.get(cacheKey(lang, item.text));
    if (cached) result[item.key] = cached;
    else missing.push(item);
  }
  if (!missing.length) return result;

  let translated: Record<string, string> = {};
  if (getAIStatus().available) {
    translated = await translateWithAI(missing, lang, signal);
  } else {
    for (const item of missing.slice(0, FREE_LIMIT)) {
      const text = await translateWithMyMemory(item.text, lang, signal);
      if (text) translated[item.key] = text;
    }
  }

  for (const item of missing) {
    const text = translated[item.key];
    if (!text) continue;
    cache.set(cacheKey(lang, item.text), text);
    result[item.key] = text;
  }
  return result;
}

/** Translates a list of texts in the background; untranslated keys simply stay missing. */
export function useTranslations(items: TextToTranslate[], lang: string) {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const signature = items.map((item) => `${item.key}\u0000${item.text}`).join("\u0001");

  useEffect(() => {
    if (lang === "en" || !items.length) {
      setIsTranslating(false);
      return;
    }
    const controller = new AbortController();
    setIsTranslating(true);
    translateTexts(items, lang, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setTranslations((previous) => ({ ...previous, ...result }));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setIsTranslating(false);
      });
    return () => controller.abort();
  }, [signature, lang]);

  return { translations, isTranslating };
}

/** Translates a single search query into English when no AI is available. */
export async function queryToEnglish(query: string, lang: string, signal?: AbortSignal): Promise<string> {
  if (lang === "en") return query;
  const cached = cache.get(`query:${lang}:${query}`);
  if (cached) return cached;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(query)}&langpair=${lang}|en`;
  try {
    const response = await fetch(url, { signal });
    const data = (await response.json()) as { responseStatus?: number; responseData?: { translatedText?: string } };
    const text = data.responseStatus === 200 ? data.responseData?.translatedText : undefined;
    if (text) cache.set(`query:${lang}:${query}`, text);
    return text ?? query;
  } catch {
    return query;
  }
}
