const TIMEOUT_MS = 20_000;
const MAX_BYTES = 20_000_000;
// Readability needs markup; the reader-service fallback returns text/plain.
const ALLOWED_CONTENT_TYPE = /^(?:text\/|application\/(?:xhtml\+xml|xml))/i;

export async function fetchText(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      // Without this an unresponsive host spins the command's toast forever
      // with no way to cancel it.
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error(`Request timed out after ${TIMEOUT_MS / 1000}s.`);
    }
    throw err;
  }

  if (!res.ok) {
    throw new Error(`Request failed (${res.status} ${res.statusText})`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType && !ALLOWED_CONTENT_TYPE.test(contentType)) {
    throw new Error(
      `That URL returned ${contentType.split(";")[0].trim()}, not a webpage.`,
    );
  }

  const declaredBytes = Number(res.headers.get("content-length"));
  if (Number.isFinite(declaredBytes) && declaredBytes > MAX_BYTES) {
    throw new Error(`Page is too large (${formatMb(declaredBytes)}).`);
  }

  const text = await res.text();
  // Not every server sends content-length, so check the real payload too.
  if (text.length > MAX_BYTES) {
    throw new Error(`Page is too large (${formatMb(text.length)}).`);
  }

  return text;
}

function formatMb(bytes: number): string {
  return `${Math.round(bytes / 1_000_000)} MB`;
}
