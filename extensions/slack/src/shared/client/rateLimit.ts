import { WebClient, WebClientEvent } from "@slack/web-api";

export const slackRateLimitDocumentationUrl = "https://docs.slack.dev/apis/web-api/rate-limits/";

export function observeSlackRateLimits(client: WebClient, onRateLimited: (retryAfter: number) => void): WebClient {
  client.on(WebClientEvent.RATE_LIMITED, onRateLimited);
  return client;
}

export function formatRetryAfter(retryAfterSeconds: number): string {
  const seconds = Math.max(1, Math.ceil(retryAfterSeconds));
  if (seconds < 60) return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const formattedMinutes = `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;

  if (remainingSeconds === 0) return formattedMinutes;
  return `${formattedMinutes} ${remainingSeconds} ${remainingSeconds === 1 ? "second" : "seconds"}`;
}

export function getRetryAfter(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;

  const rateLimitError = error as {
    retryAfter?: unknown;
    headers?: Record<string, unknown>;
    message?: unknown;
  };
  const retryAfter = rateLimitError.retryAfter ?? rateLimitError.headers?.["retry-after"];

  if (typeof retryAfter === "number" && Number.isFinite(retryAfter)) return retryAfter;
  if (typeof retryAfter === "string" && /^\d+$/.test(retryAfter)) return Number(retryAfter);
  if (typeof rateLimitError.message !== "string") return undefined;

  const match = rateLimitError.message.match(/(?:retry-after:\s*|retry(?: this request)? in\s+)(\d+)/i);
  return match ? Number(match[1]) : undefined;
}

export function isRateLimitError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("message" in error)) return false;
  return typeof error.message === "string" && /rate.?limit/i.test(error.message);
}
