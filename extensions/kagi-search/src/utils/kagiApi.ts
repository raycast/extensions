// src/utils/kagiSearchApi.ts
import { nanoid } from "nanoid";
import { SearchResult } from "./types";

// Types match the official Kagi v1 API client:
// https://github.com/kagisearch/kagi-openapi-typescript
interface KagiSearchItem {
  url: string;
  title: string;
  snippet?: string;
  time?: string;
}

interface KagiSearchResponse {
  meta?: {
    id?: string;
    node?: string;
    ms?: number;
    api_balance?: number;
  };
  data?: {
    search?: KagiSearchItem[];
    news?: KagiSearchItem[];
    related_search?: KagiSearchItem[];
  };
}

export async function searchWithKagiAPI(query: string, apiKey: string, signal: AbortSignal): Promise<SearchResult[]> {
  const response = await fetch("https://kagi.com/api/v1/search", {
    method: "POST",
    signal: signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: query,
    }),
  });

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const data = (await response.json()) as KagiSearchResponse;

  return (data.data?.search ?? []).map((item) => ({
    id: nanoid(),
    query: item.title,
    description: item.snippet || "",
    url: item.url,
    isApiResult: true,
  }));
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
      id: nanoid(),
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
