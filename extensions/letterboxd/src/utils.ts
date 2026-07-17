import { environment } from "@raycast/api";
import { NodeHtmlMarkdown } from "node-html-markdown";

export function sleep(duration: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

const HEADERS: Record<string, string> = {
  accept: "text/html,application/xhtml+xml,application/xml",
  "cache-control": "no-cache",
  pragma: "no-cache",
  "User-Agent": `Letterboxd Extension, Raycast/${environment.raycastVersion}`,
  "sec-ch-ua":
    '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
};
const RETRY_BASE_DELAY = 1000;

export function humanizeInteger(value: number): string {
  if (value < 1000) {
    return value.toString();
  }
  return `${Math.floor(value / 1000)}k`;
}

export async function fetchWithRetry(
  url: string,
  limit = 2,
  validate?: (response: string) => boolean,
): Promise<string> {
  let retryCount = 0;

  while (retryCount < limit) {
    try {
      const response = await fetch(url, {
        headers: HEADERS,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.text();

      if (validate?.(result) === false) {
        throw new Error("Validation failed");
      }

      return result;
    } catch (error) {
      console.log(`Failed to fetch ${url}. ${error}`);

      const delay = RETRY_BASE_DELAY + 750 * retryCount;
      await sleep(delay);

      retryCount++;
    }
  }

  throw new Error(`Failed after ${limit} retries`);
}

export function convertHtmlToCommonMark(html: string): string {
  return NodeHtmlMarkdown.translate(html);
}
