import { REQUEST_TIMEOUT_MS, USER_AGENT } from "./constants";

interface RequestOptions {
  method?: "GET" | "POST";
  body?: string;
  contentType?: string;
  accept?: string;
}

/**
 * Thin wrapper around the global fetch (Node 22 in the Raycast runtime) that adds our
 * User-Agent and a hard timeout to every request.
 */
export async function requestText(url: string, options: RequestOptions = {}): Promise<string> {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: options.accept ?? "*/*",
  };
  if (options.contentType) {
    headers["Content-Type"] = options.contentType;
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
  }

  return response.text();
}

/**
 * Turn low-level network failures into something a user can act on. Without this the UI
 * just says "fetch failed", which is exactly what made the Cloudflare sources look broken.
 */
export function describeNetworkError(error: unknown, family: "IPv4" | "IPv6"): string {
  if (error instanceof Error) {
    if (error.name === "TimeoutError") {
      return `Timed out after ${REQUEST_TIMEOUT_MS / 1000}s`;
    }
    if (error.name === "AbortError") {
      return "Request aborted";
    }

    const code = (error.cause as NodeJS.ErrnoException | undefined)?.code;
    switch (code) {
      case "ENETUNREACH":
      case "EHOSTUNREACH":
      case "EADDRNOTAVAIL":
        return family === "IPv6" ? "No IPv6 connectivity" : "Network unreachable";
      case "ECONNREFUSED":
        return "Connection refused";
      case "ECONNRESET":
        return "Connection reset — the endpoint may be blocked on this network";
      case "ENOTFOUND":
      case "EAI_AGAIN":
        return "DNS lookup failed";
      case "CERT_HAS_EXPIRED":
      case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
      case "SELF_SIGNED_CERT_IN_CHAIN":
        return "TLS certificate rejected — traffic may be intercepted";
      default:
        break;
    }

    return error.message;
  }

  return String(error);
}
