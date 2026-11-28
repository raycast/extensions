// Resolves the page <title> from a bookmark URL.
// The server cannot reach internal networks, so the client (Raycast = Node) fetches directly.

const FETCH_TIMEOUT_MS = 5000;

// Some sites return 403 / block bots when hit with Node's default UA → disguise as a browser UA.
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type PageTitleFetchFailure = "timeout" | "redirect" | "network";

function getErrorText(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  const cause = "cause" in error ? (error as Error & { cause?: unknown }).cause : undefined;
  return `${error.name} ${error.message} ${cause ? getErrorText(cause) : ""}`.toLowerCase();
}

function classifyFetchFailure(error: unknown): PageTitleFetchFailure {
  const errorText = getErrorText(error);

  if ((error instanceof Error && error.name === "AbortError") || errorText.includes("timeout")) return "timeout";
  if (errorText.includes("redirect")) return "redirect";
  return "network";
}

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => HTML_ENTITIES[name.toLowerCase()] ?? m);
}

// Prefer og:title when present. It is the cleaner copy the site owner explicitly set for
// sharing, so it usually lacks the site-name suffix. E.g. YouTube's <title> is "<video title> - YouTube"
// while og:title is just "<video title>". Fall back to <title>.
function extractTitle(html: string): string | null {
  const ogPatterns = [
    /<meta[^>]*\bproperty\s*=\s*["']og:title["'][^>]*\bcontent\s*=\s*["']([^"']*)["']/i,
    /<meta[^>]*\bcontent\s*=\s*["']([^"']*)["'][^>]*\bproperty\s*=\s*["']og:title["']/i,
  ];
  for (const p of ogPatterns) {
    const c = html.match(p)?.[1];
    if (c) {
      const t = decodeHtmlEntities(c).replace(/\s+/g, " ").trim();
      if (t) return t;
    }
  }
  const m = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  const title = decodeHtmlEntities(m[1]).replace(/\s+/g, " ").trim();
  return title || null;
}

export async function fetchPageTitle(pageUrl: string): Promise<string | null> {
  // Non-http(s) schemes (slack:, mailto:, etc.) cannot be fetched.
  let parsed: URL;
  try {
    parsed = new URL(pageUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(pageUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) return null;
    const html = await res.text();
    return extractTitle(html);
  } catch (error) {
    // The full URL may contain sensitive info (query string, etc.), so log only the hostname.
    console.warn(`Page title fetch failed (${classifyFetchFailure(error)}): ${parsed.hostname}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
