import { useFetch } from "@raycast/utils";
import fetch from "node-fetch";

export type TransliterationResult =
  | { state: "success"; originalText: string; options: string[] }
  | { state: "loading" }
  | { state: "error"; message: string };

function containsArabic(text: string): boolean {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
  return arabicPattern.test(text);
}

const YAMLI_API_URL = (word: string) =>
  `https://api.yamli.com/transliterate.ashx?word=${encodeURIComponent(word)}&tool=api&account_id=000006&prot=https%3A&hostname=www.yamli.com&path=%2F&build=5515&sxhr_id=4`;

const DUMMY_URL = "http://localhost:3000";

function parseYamliResponseSync(data: string, englishText: string): TransliterationResult {
  const match = data.match(/Yamli\.I\.SXHRData\.dataCallback\((\{.*\})\)/);
  if (!match) return { state: "error", message: "Failed to parse API response ❌" };

  try {
    const jsonData = JSON.parse(match[1]);
    const parsedData = JSON.parse(jsonData.data);
    if (!parsedData) return { state: "error", message: "No valid data received." };

    const options = parsedData.r
      .split("|")
      .map((item: string) => item.replace(/[^\u0600-\u06FF\u0750-\u077F]/g, ""))
      .filter((item: string) => item.length > 0);

    return {
      state: "success",
      originalText: englishText,
      options: options,
    };
  } catch (error) {
    return { state: "error", message: "Failed to parse API response ❌" };
  }
}

function handleArabicOrEmpty(text: string): TransliterationResult | null {
  if (!text || containsArabic(text)) {
    return {
      state: "success",
      originalText: text || "",
      options: [],
    };
  }
  return null;
}

export function useFetchTransliteration(englishText: string): TransliterationResult {
  const isArabic = containsArabic(englishText);
  const { data, isLoading } = useFetch<string>(isArabic ? DUMMY_URL : YAMLI_API_URL(englishText));

  const arabicOrEmpty = handleArabicOrEmpty(englishText);
  if (arabicOrEmpty) return arabicOrEmpty;
  if (isLoading) return { state: "loading" };
  if (!data) return { state: "error", message: "Error fetching data 😞" };

  return parseYamliResponseSync(data, englishText);
}

export async function fetchTransliteration(englishText: string): Promise<TransliterationResult> {
  const arabicOrEmpty = handleArabicOrEmpty(englishText);
  if (arabicOrEmpty) return arabicOrEmpty;

  try {
    const response = await fetch(YAMLI_API_URL(englishText));
    const data = await response.text();
    return parseYamliResponseSync(data, englishText);
  } catch (error) {
    return { state: "error", message: "Error fetching data 😞" };
  }
}
