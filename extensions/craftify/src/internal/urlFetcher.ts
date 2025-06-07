// src/extract.ts
import fetch from "node-fetch";
import { extractContent } from "@wrtnlabs/web-content-extractor";

/**
 * Loads a page by URL and returns the main text content.
 * @param url — page address
 */
export async function fetchUrlAndExtractText(url: string): Promise<string> {
  // 1. Load HTML
  const res = await fetch(url, {
    headers: {
      // set User-Agent so that sites do not block requests
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to load page: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();

  // 2. Extract content using web-content-extractor
  const { content } = extractContent(html);
  if (!content) {
    throw new Error("Failed to extract article text");
  }
  return content.trim();
}
