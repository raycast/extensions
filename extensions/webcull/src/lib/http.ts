import { environment } from "@raycast/api";

type PostValue = string | number | boolean | null | undefined;
export type WebCullApiResponse = Record<string, unknown>;

export async function postWebCull(
  apiBaseUrl: string,
  path: string,
  data: Record<string, PostValue>,
  token?: string,
): Promise<WebCullApiResponse> {
  const body = new URLSearchParams();

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      body.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = new URL(path, apiBaseUrl);
  allowDevelopmentLocalTls(url);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers,
      body,
    });
  } catch (error) {
    throw new Error(networkFailureMessage(url, error));
  }

  const text = await response.text();
  let parsed: WebCullApiResponse;

  try {
    parsed = JSON.parse(text) as WebCullApiResponse;
  } catch {
    throw new Error("Invalid JSON response from WebCull.");
  }

  if (!response.ok) {
    throw new Error(safeMessage(parsed.failure || parsed.error || "WebCull API request failed."));
  }

  if (parsed.error === "throttled") {
    throw new Error("WebCull rate limit reached. Wait a minute, then try again.");
  }

  return parsed;
}

function allowDevelopmentLocalTls(url: URL): void {
  if (!environment.isDevelopment || !isDevelopmentLocalHost(url.hostname)) {
    return;
  }
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

function isDevelopmentLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".testwebcull.test")
  );
}

function networkFailureMessage(url: URL, error: unknown): string {
  const details = errorDetails(error);
  return safeMessage(`Could not reach WebCull API at ${url.origin}.${details}`);
}

function errorDetails(error: unknown): string {
  if (!(error instanceof Error)) {
    return "";
  }

  const cause = error.cause;
  if (cause && typeof cause === "object") {
    const code = "code" in cause ? String(cause.code || "") : "";
    const message = "message" in cause ? String(cause.message || "") : "";
    if (code || message) {
      return " " + [code, message].filter(Boolean).join(": ");
    }
  }

  return error.message ? " " + error.message : "";
}

export function safeMessage(message: unknown): string {
  return String(message || "")
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+/gi, "Bearer [redacted]")
    .replace(/wco_cli_[A-Za-z0-9_-]+/g, "[redacted-access-token]");
}

export function responseMessage(response: WebCullApiResponse, fallback: string): string {
  const message = response.failure || response.error;

  if (typeof message === "string" && message.trim()) {
    return safeMessage(message);
  }

  return fallback;
}

export function responseItems<T>(response: WebCullApiResponse): T[] {
  return Array.isArray(response.items) ? (response.items as T[]) : [];
}
