// 북마크 URL로부터 favicon URL을 resolve한다.
// 서버가 내부망에 접근할 수 없기 때문에 클라이언트 측에서 수행한다.
// 1) HTML을 fetch하여 <link rel="icon"> 등에서 href 추출
// 2) 실패 시 <origin>/favicon.ico를 GET으로 확인

const FETCH_TIMEOUT_MS = 5000;

// 일부 사이트는 Node 기본 UA로 오면 403/봇차단 → 브라우저 UA로 위장.
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
  // 우선순위: icon > shortcut icon > apple-touch-icon
  const byRel = (r: string) => candidates.find((c) => c.rel.includes(r))?.href;
  return byRel("icon") || byRel("shortcut") || byRel("apple-touch") || candidates[0].href;
}

export async function resolveFaviconUrl(pageUrl: string): Promise<string | null> {
  let origin: string;
  try {
    const parsed = new URL(pageUrl);
    // fetchPageTitle과 동일하게 웹 URL만 처리. mailto:, file:, data: 등은 fetch하지 않는다.
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    origin = parsed.origin;
  } catch {
    return null;
  }

  // 1) HTML 파싱 시도
  try {
    const res = await fetchWithTimeout(pageUrl);
    if (res.ok) {
      const html = await res.text();
      const href = extractIconHref(html);
      if (href) {
        try {
          return new URL(href, pageUrl).toString();
        } catch {
          // href가 깨진 URL인 경우 무시하고 fallback으로.
        }
      }
    }
  } catch {
    // 네트워크 실패 / 타임아웃 → fallback 시도
  }

  // 2) /favicon.ico fallback. 일부 서버가 HEAD에 405를 주기 때문에 GET 사용.
  try {
    const fallback = `${origin}/favicon.ico`;
    const res = await fetchWithTimeout(fallback);
    if (res.ok) return fallback;
  } catch {
    // 무시
  }

  return null;
}
