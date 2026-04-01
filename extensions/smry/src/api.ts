import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  baseUrl: string;
}

function getBaseUrl(): string {
  const { baseUrl } = getPreferenceValues<Preferences>();
  return baseUrl.replace(/\/$/, "") || "https://smry.ai";
}

export interface Article {
  title: string;
  content: string;
  textContent: string;
  byline?: string;
  siteName?: string;
  publishedDate?: string;
  image?: string;
  url: string;
}

interface ArticleResponse {
  status: string;
  article?: Article;
  error?: string;
}

export async function fetchArticle(url: string): Promise<Article> {
  const baseUrl = getBaseUrl();
  const apiUrl = `${baseUrl}/api/article?url=${encodeURIComponent(url)}`;

  const response = await fetch(apiUrl, {
    headers: {
      "User-Agent": "SMRY-Raycast/1.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch article: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ArticleResponse;

  if (data.status === "error" || !data.article) {
    throw new Error(data.error || "Failed to extract article");
  }

  return { ...data.article, url };
}

interface SummaryChunk {
  type: string;
  value?: string;
}

export async function fetchSummary(content: string, title: string): Promise<string> {
  const baseUrl = getBaseUrl();
  const apiUrl = `${baseUrl}/api/summary`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "SMRY-Raycast/1.0",
    },
    body: JSON.stringify({
      content: content.slice(0, 12000),
      title,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get summary: ${response.status} ${response.statusText}`);
  }

  // The summary endpoint streams SSE - collect all text chunks
  const text = await response.text();
  const lines = text.split("\n");
  let summary = "";

  for (const line of lines) {
    if (line.startsWith("0:")) {
      // Vercel AI SDK streaming format: 0:"text chunk"
      try {
        const chunk = JSON.parse(line.slice(2));
        if (typeof chunk === "string") {
          summary += chunk;
        }
      } catch {
        // skip unparseable lines
      }
    }
  }

  return summary || "Unable to generate summary.";
}

export function getSmryUrl(articleUrl: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/${articleUrl}`;
}

export function isValidUrl(text: string): boolean {
  try {
    const url = new URL(text.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
