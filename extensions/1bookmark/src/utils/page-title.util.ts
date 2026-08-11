// 북마크 URL로부터 페이지 <title>을 resolve한다.
// 서버가 내부망에 접근할 수 없기 때문에 클라이언트(Raycast = Node)에서 직접 fetch.

const FETCH_TIMEOUT_MS = 5000;

// 일부 사이트는 Node 기본 UA로 오면 403/봇차단 → 브라우저 UA로 위장.
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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

// og:title 이 있으면 우선 사용. 사이트 owner가 sharing 용으로 명시한 더 깔끔한
// 카피라 보통 사이트명 접미사가 없다. 예) YouTube 는 <title>이 "<영상제목> - YouTube"
// 인데 og:title 은 "<영상제목>"만. 폴백으로 <title> 사용.
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
  // http(s) 외 스킴(slack:, mailto: 등)은 fetch 불가.
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
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
