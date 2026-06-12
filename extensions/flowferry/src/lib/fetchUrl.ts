import { FETCH_MAX_BYTES, FETCH_TIMEOUT_MS, USER_AGENT } from "./constants";

/**
 * Fetch the raw HTML at `url` for client-side extraction. Enforces:
 * - UA so sites don't 403 a bare Node fetch.
 * - 15 s abort timeout.
 * - text/html content-type only.
 * - 5 MB size cap.
 *
 * Caller should already have validated `url` with `new URL(...)`.
 */
export async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
      throw new Error(`Unsupported content-type: ${contentType || "unknown"}`);
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > FETCH_MAX_BYTES) {
      throw new Error(`Page is too large (${Math.round(buffer.byteLength / 1024)} KB).`);
    }

    return new TextDecoder("utf-8").decode(buffer);
  } finally {
    clearTimeout(timeout);
  }
}
