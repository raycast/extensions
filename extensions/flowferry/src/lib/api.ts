import { ARTICLES_ENDPOINT } from "./constants";
import type { ArticlePayload } from "./types";

export class InvalidApiKeyError extends Error {
  constructor(message = "Invalid API key") {
    super(message);
    this.name = "InvalidApiKeyError";
  }
}

/**
 * Post an extracted article to flowferry.app/api/v1/articles. Throws
 * `InvalidApiKeyError` on 401 so callers can route to "Open Extension
 * Preferences" without parsing a string.
 */
export async function postArticle(apiKey: string, payload: ArticlePayload): Promise<void> {
  if (!apiKey) {
    throw new InvalidApiKeyError("API key is missing. Set it in extension preferences.");
  }

  const response = await fetch(ARTICLES_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    throw new InvalidApiKeyError();
  }

  if (!response.ok) {
    let body = "";
    try {
      body = await response.text();
    } catch {
      // ignore
    }
    throw new Error(`FlowFerry API ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
}
