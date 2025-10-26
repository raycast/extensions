import type { YandexLookupResponse } from "./types";

export async function lookupWord(
  apiKey: string,
  langPair: string,
  text: string,
): Promise<{ data: YandexLookupResponse; status: number }> {
  const res = await fetch(
    `https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=${apiKey}&lang=${langPair}&text=${encodeURIComponent(text)}`,
  );
  const data = await res.json();
  return { data: data as YandexLookupResponse, status: res.status };
}
