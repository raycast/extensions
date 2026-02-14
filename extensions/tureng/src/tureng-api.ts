import { createHash } from "node:crypto";

const SECRET = "46E59BAC-E593-4F4F-A4DB-960857086F9C";
const SEARCH_URL = "http://ws.tureng.com/TurengSearchServiceV4.svc/Search";
const AUTOCOMPLETE_URL = "https://ac.tureng.co/?t=";
const REQUEST_HEADERS = {
  "User-Agent": "CFNetwork/548.0.3 Darwin/11.2.0",
  "Content-Type": "application/json",
};

export interface LookupResponseItem {
  term: string;
  category: string;
  type: string;
}

export interface LookupResponse {
  enToTR: LookupResponseItem[];
  trToEN: LookupResponseItem[];
  suggestions: string[];
  voiceURLs: string[];
}

interface SearchResponse {
  IsSuccessful: boolean;
  MobileResult: {
    IsFound: number;
    Suggestions: string[];
    VoiceURLs: string[];
    Results: {
      CategoryEN: string;
      CategoryTR: string;
      Term: string;
      TypeEN: string;
      TypeTR: string;
    }[];
  };
}

function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

async function search(word: string): Promise<SearchResponse> {
  const response = await fetch(SEARCH_URL, {
    method: "POST",
    headers: REQUEST_HEADERS,
    body: JSON.stringify({
      Term: word,
      Code: md5(`${word}${SECRET}`),
    }),
  });
  return (await response.json()) as SearchResponse;
}

export async function autocomplete(term: string): Promise<string[]> {
  if (!term.trim()) return [];
  const response = await fetch(AUTOCOMPLETE_URL + encodeURIComponent(term.trim()));
  const result = (await response.json()) as string[];
  return result ?? [];
}

export async function lookup(word: string): Promise<LookupResponse> {
  const result: LookupResponse = { enToTR: [], trToEN: [], suggestions: [], voiceURLs: [] };
  const searchResponse = await search(word);

  if (searchResponse.IsSuccessful && searchResponse.MobileResult.IsFound === 1) {
    result.voiceURLs = searchResponse.MobileResult.VoiceURLs ?? [];
    for (const item of searchResponse.MobileResult.Results) {
      const enToTR = item.CategoryEN.includes("en->tr");
      result[enToTR ? "enToTR" : "trToEN"].push({
        term: item.Term,
        category: enToTR ? item.CategoryTR : item.CategoryEN,
        type: enToTR ? item.TypeTR : item.TypeEN,
      });
    }
  } else {
    result.suggestions = searchResponse.MobileResult?.Suggestions ?? [];
  }

  return result;
}
