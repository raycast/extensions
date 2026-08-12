import { environment } from "@raycast/api";
import { NodeHtmlMarkdown } from "node-html-markdown";

export function sleep(duration: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

const BASE_HEADERS: Record<string, string> = {
  "cache-control": "no-cache",
  pragma: "no-cache",
  "User-Agent": `Letterboxd Extension, Raycast/${environment.raycastVersion}`,
};

const HTML_HEADERS: Record<string, string> = {
  ...BASE_HEADERS,
  accept: "text/html,application/xhtml+xml,application/xml",
  "sec-ch-ua":
    '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
};

const JSON_HEADERS: Record<string, string> = {
  ...BASE_HEADERS,
  accept: "application/json",
};

const RETRY_BASE_DELAY = 1000;

export function humanizeInteger(value: number): string {
  if (value < 1000) {
    return value.toString();
  }
  return `${Math.floor(value / 1000)}k`;
}

async function requestWithRetry<T>(
  url: string,
  headers: Record<string, string>,
  transform: (response: string) => T,
  limit = 2,
  validate?: (response: string) => boolean,
): Promise<T> {
  let retryCount = 0;

  while (retryCount < limit) {
    try {
      const response = await fetch(url, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.text();

      if (validate?.(result) === false) {
        throw new Error("Validation failed");
      }

      return transform(result);
    } catch (error) {
      console.log(`Failed to fetch ${url}. ${error}`);

      const delay = RETRY_BASE_DELAY + 750 * retryCount;
      await sleep(delay);

      retryCount++;
    }
  }

  throw new Error(`Failed after ${limit} retries`);
}

export function fetchWithRetry(
  url: string,
  limit = 2,
  validate?: (response: string) => boolean,
): Promise<string> {
  return requestWithRetry(
    url,
    HTML_HEADERS,
    (response) => response,
    limit,
    validate,
  );
}

export function fetchJsonWithRetry<T>(url: string, limit = 2): Promise<T> {
  return requestWithRetry(
    url,
    JSON_HEADERS,
    (response) => JSON.parse(response) as T,
    limit,
  );
}

export function convertHtmlToCommonMark(html: string): string {
  return NodeHtmlMarkdown.translate(html);
}
