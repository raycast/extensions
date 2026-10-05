// Resolves the favicon URL from a bookmark URL.
// The server cannot reach internal networks, so this runs on the client side.
// 1) Fetch the HTML and extract href from <link rel="icon"> etc.
// 2) On failure, check <origin>/favicon.ico with a GET

const FETCH_TIMEOUT_MS = 5000;

// Some sites return 403 / block bots when hit with Node's default UA → disguise as a browser UA.
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        ...(init.headers as Record<string, string> | undefined),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function extractIconHref(html: string): string | null {
  // <link rel="icon" ..> | <link rel="shortcut icon" ..> | <link rel="apple-touch-icon" ..>
  const linkRegex = /<link\b[^>]*\brel\s*=\s*["']([^"']+)["'][^>]*>/gi;
  const hrefRegex = /\bhref\s*=\s*["']([^"']+)["']/i;
  const candidates: { rel: string; href: string }[] = [];

  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    const rel = match[1].toLowerCase();
    if (!/\b(icon|shortcut icon|apple-touch-icon)\b/.test(rel)) continue;
    const hrefMatch = hrefRegex.exec(match[0]);
    if (!hrefMatch) continue;
    candidates.push({ rel, href: hrefMatch[1] });
  }

  if (candidates.length === 0) return null;
  // Priority: icon > shortcut icon > apple-touch-icon
  const byRel = (r: string) => candidates.find((c) => c.rel.includes(r))?.href;
  return byRel("icon") || byRel("shortcut") || byRel("apple-touch") || candidates[0].href;
}

export async function resolveFaviconUrl(pageUrl: string): Promise<string | null> {
  let origin: string;
  try {
    const parsed = new URL(pageUrl);
    // Same as fetchPageTitle: handle web URLs only. Do not fetch mailto:, file:, data:, etc.
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    origin = parsed.origin;
  } catch {
    return null;
  }

  // 1) Try parsing the HTML
  try {
    const res = await fetchWithTimeout(pageUrl);
    if (res.ok) {
      const html = await res.text();
      const href = extractIconHref(html);
      if (href) {
        try {
          return new URL(href, pageUrl).toString();
        } catch {
          // If href is a malformed URL, ignore it and go to the fallback.
        }
      }
    }
  } catch {
    // Network failure / timeout → try the fallback
  }

  // 2) /favicon.ico fallback. Use GET because some servers respond 405 to HEAD.
  try {
    const fallback = `${origin}/favicon.ico`;
    const res = await fetchWithTimeout(fallback);
    if (res.ok) return fallback;
  } catch {
    // Ignore
  }

  return null;
}
