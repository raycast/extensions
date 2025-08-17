// src/utils/kagiSearchApi.ts
import fetch from "node-fetch";
import { randomId } from "@raycast/api";
import { SearchResult } from "./types";

interface KagiSearchResponse {
  meta: {
    id: string;
    node: string;
    ms: number;
    api_balance: number;
  };
  data: Array<{
    t: number;
    url: string;
    title: string;
    snippet?: string;
    published?: string;
    thumbnail?: {
      url: string;
      width?: number;
      height?: number;
    };
    list?: string[]; // for related searches (t=1)
  }>;
}

export async function searchWithKagiAPI(query: string, apiKey: string, signal: AbortSignal): Promise<SearchResult[]> {
  const response = await fetch(`https://kagi.com/api/v0/search?q=${encodeURIComponent(query)}`, {
    method: "GET",
    signal: signal,
    headers: {
      Authorization: `Bot ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const data = (await response.json()) as KagiSearchResponse;
  const results: SearchResult[] = [];

  // Process search results (t=0)
  data.data.forEach((item) => {
    if (item.t === 0) {
      results.push({
        id: randomId(),
        query: item.title,
        description: item.snippet || "",
        url: item.url,
        isApiResult: true,
      });
    }
  });

  return results;
}

interface FastGPTResponse {
  data: {
    output: string;
    references: {
      title: string;
      snippet: string;
      url: string;
    }[];
  };
}

// src/utils/kagiApi.ts - update the searchWithFastGPT function
export async function searchWithFastGPT(
  query: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<SearchResult | undefined> {
  try {
    const response = await fetch("https://kagi.com/api/v0/fastgpt", {
      method: "POST",
      signal: signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${apiKey}`,
      },
      body: JSON.stringify({
        query: query,
        web_search: true,
      }),
    });

    if (!response.ok) {
      return Promise.reject(response.statusText);
    }

    const data = (await response.json()) as FastGPTResponse;

    // Create a result for the FastGPT answer
    return {
      id: randomId(),
      query: query,
      description: "FastGPT Answer",
      url: `https://kagi.com/search?q=${encodeURIComponent(query)}`,
      content: data.data.output,
      references: data.data.references,
    };
  } catch (error) {
    console.error("FastGPT error:", error);
    return undefined;
  }
}
