import { convert } from "html-to-text";

const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Rough limit to stay within model context (characters). */
export const MAX_PAGE_TEXT_CHARS = 120_000;

export class FetchPageError extends Error {
  constructor(
    message: string,
    public readonly kind: "network" | "http" | "empty" = "network",
  ) {
    super(message);
    this.name = "FetchPageError";
  }
}

/**
 * Fetches a URL and returns readable text (scripts/styles stripped).
 */
export async function fetchPageAsPlainText(url: string): Promise<string> {
  let res: Response;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 45_000);
  try {
    res = await fetch(url, {
      headers: { "User-Agent": DEFAULT_UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(t);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("abort")) {
      throw new FetchPageError("Request timed out while loading the page.", "network");
    }
    throw new FetchPageError(`Could not load URL: ${msg}`, "network");
  }
  clearTimeout(t);

  if (!res.ok) {
    throw new FetchPageError(`HTTP ${res.status} ${res.statusText}`, "http");
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("text/html") && !ct.includes("text/plain") && !ct.includes("application/xhtml")) {
    throw new FetchPageError(
      `Unsupported content type: ${ct || "unknown"}. Open a normal HTML page in the browser.`,
      "empty",
    );
  }

  const html = await res.text();
  if (!html.trim()) {
    throw new FetchPageError("The page body was empty.", "empty");
  }

  let text = convert(html, {
    wordwrap: false,
    selectors: [
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
    ],
  });

  text = text.replace(/\n{3,}/g, "\n\n").trim();
  if (!text) {
    throw new FetchPageError(
      "No readable text was extracted (page may be mostly JavaScript). Try screen capture instead.",
      "empty",
    );
  }

  if (text.length > MAX_PAGE_TEXT_CHARS) {
    text = `${text.slice(0, MAX_PAGE_TEXT_CHARS)}\n\n[Truncated after ${MAX_PAGE_TEXT_CHARS} characters.]`;
  }

  return text;
}
