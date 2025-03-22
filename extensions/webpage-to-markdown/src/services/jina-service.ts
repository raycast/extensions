import fetch from "node-fetch";
import { Preferences, JinaResponse } from "../types";

export async function fetchJinaMarkdown(url: string, preferences: Preferences): Promise<JinaResponse> {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (preferences.jinaApiKey) {
    headers["Authorization"] = `Bearer ${preferences.jinaApiKey}`;
  }

  if (preferences.includeLinksSummary) {
    headers["X-With-Links-Summary"] = "true";
  }

  const response = await fetch(jinaUrl, {
    method: "GET",
    headers: headers,
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        `Rate limit exceeded. ${
          !preferences.jinaApiKey
            ? "Consider adding your Jina.ai API key in extension preferences to avoid rate limiting."
            : "Please try again later."
        }`,
      );
    }
    throw new Error(`Failed to fetch markdown: ${response.statusText}`);
  }

  return response.json() as Promise<JinaResponse>;
}
