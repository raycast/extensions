import { useFetch } from "@raycast/utils";
import fetch from "node-fetch";

// Constants
const YAMLI_API_URL = (word: string) =>
  `https://api.yamli.com/transliterate.ashx?word=${encodeURIComponent(word)}&tool=api&account_id=000006&prot=https%3A&hostname=www.yamli.com&path=%2F&build=5515&sxhr_id=4`;
// We use the dummy URL to avoid making a request to the Yamli API when the input is already in Arabic.
// This is to avoid the issue around inconsistent hooks order in re-renders if we skip the useFetch hook conditionally.
const DUMMY_URL = "http://localhost:3000";

// Types
export type TransliterationResult =
  | { state: "success"; originalText: string; options: string[] }
  | { state: "loading"; originalText: string }
  | { state: "error"; message: string; originalText: string };

// Helpers
function containsArabic(text: string): boolean {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
  return arabicPattern.test(text);
}

function createErrorResult(message: string, englishText: string): TransliterationResult {
  return { state: "error", message, originalText: englishText };
}

function parseYamliResponseSync(data: string, englishText: string): TransliterationResult {
  const match = data.match(/Yamli\.I\.SXHRData\.dataCallback\((\{.*?\})\)/);
  if (!match) return createErrorResult("Failed to parse API response", englishText);

  try {
    const jsonData = JSON.parse(match[1]);
    const parsedData = JSON.parse(jsonData.data);
    if (!parsedData) return createErrorResult("No valid data received.", englishText);

    const options = parsedData.r
      .split("|")
      .map((item: string) => item.replace(/[^\u0600-\u06FF\u0750-\u077F]/g, ""))
      .filter((item: string) => item.length > 0);

    return { state: "success", originalText: englishText, options };
  } catch (error) {
    return createErrorResult("Failed to parse API response", englishText);
  }
}

// Returns a success result with empty options for Arabic or empty text
function createEmptyResult(text: string): TransliterationResult | null {
  if (!text || containsArabic(text)) {
    return { state: "success", originalText: text || "", options: [] };
  }
  return null;
}

// Hooks and Exports
export function useFetchTransliteration(englishText: string): TransliterationResult {
  const isArabic = containsArabic(englishText);
  const { data, isLoading } = useFetch<string>(isArabic ? DUMMY_URL : YAMLI_API_URL(englishText));

  const arabicOrEmpty = createEmptyResult(englishText);
  if (arabicOrEmpty) return arabicOrEmpty;
  if (isLoading) return { state: "loading", originalText: englishText };
  if (!data) return createErrorResult("Error fetching data!", englishText);

  return parseYamliResponseSync(data, englishText);
}

export async function fetchTransliteration(englishText: string): Promise<TransliterationResult> {
  const arabicOrEmpty = createEmptyResult(englishText);
  if (arabicOrEmpty) return arabicOrEmpty;

  try {
    const response = await fetch(YAMLI_API_URL(englishText));
    const data = await response.text();
    return parseYamliResponseSync(data, englishText);
  } catch (error) {
    return createErrorResult("Error fetching data!", englishText);
  }
}
