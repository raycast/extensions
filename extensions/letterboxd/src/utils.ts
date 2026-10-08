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

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfter?: number,
  ) {
    super(`HTTP error! status: ${status}`);
  }
}

export function humanizeInteger(value: number): string {
  return new Intl.NumberFormat(undefined, {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function getRetryAfter(response: Response): number | undefined {
  const value = response.headers.get("retry-after");
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

function shouldRetry(error: unknown): boolean {
  if (error instanceof HttpError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }
  return error instanceof TypeError;
}

async function requestWithRetry<T>(
  url: string,
  headers: Record<string, string>,
  transform: (response: string) => T,
  limit = 2,
  validate?: (response: string) => boolean,
): Promise<T> {
  for (let attempt = 0; attempt < limit; attempt++) {
    try {
      const response = await fetch(url, {
        headers,
      });

      if (!response.ok) {
        throw new HttpError(response.status, getRetryAfter(response));
      }

      const result = await response.text();

      if (validate?.(result) === false) {
        throw new Error("Validation failed");
      }

      return transform(result);
    } catch (error) {
      const hasAnotherAttempt = attempt + 1 < limit;
      if (!hasAnotherAttempt || !shouldRetry(error)) throw error;

      const delay =
        error instanceof HttpError && error.retryAfter !== undefined
          ? error.retryAfter
          : RETRY_BASE_DELAY + 750 * attempt;
      console.log(`Retrying ${url} after ${String(error)}`);
      await sleep(delay);
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
