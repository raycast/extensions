import { getPreferenceValues } from "@raycast/api";

interface Prefs {
  microlinkApiKey?: string;
  enableScreenshotFallback?: boolean;
}

function resolveUrl(maybeRelative: string, base: string): string {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return maybeRelative;
  }
}

function pickMeta(html: string, names: string[]): string | undefined {
  for (const n of names) {
    const re1 = new RegExp(
      `<meta[^>]+(?:property|name)=["']${n}["'][^>]+content=["']([^"']+)["']`,
      "i",
    );
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${n}["']`,
      "i",
    );
    const m = html.match(re1)?.[1] ?? html.match(re2)?.[1];
    if (m) return m.trim();
  }
  return undefined;
}

function pickLink(html: string, rels: string[]): string | undefined {
  for (const rel of rels) {
    const re1 = new RegExp(
      `<link[^>]+rel=["'][^"']*${rel}[^"']*["'][^>]+href=["']([^"']+)["']`,
      "i",
    );
    const re2 = new RegExp(
      `<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*${rel}[^"']*["']`,
      "i",
    );
    const m = html.match(re1)?.[1] ?? html.match(re2)?.[1];
    if (m) return m.trim();
  }
  return undefined;
}

const BAD_IMG_HINT =
  /(sprite|logo|icon|favicon|pixel|spacer|blank|1x1|placeholder|avatar|tracking)/i;

function pickFirstContentImage(html: string, base: string): string | undefined {
  const re = /<img[^>]+>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const src =
      tag
        .match(/\bsrcset=["']([^"']+)["']/i)?.[1]
        ?.split(",")[0]
        ?.trim()
        .split(" ")[0] ??
      tag.match(/\bdata-src=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (!src) continue;
    if (src.startsWith("data:")) continue;
    if (BAD_IMG_HINT.test(src)) continue;

    const widthAttr = parseInt(
      tag.match(/\bwidth=["']?(\d+)/i)?.[1] ?? "0",
      10,
    );
    const heightAttr = parseInt(
      tag.match(/\bheight=["']?(\d+)/i)?.[1] ?? "0",
      10,
    );
    if ((widthAttr && widthAttr < 200) || (heightAttr && heightAttr < 200))
      continue;

    return resolveUrl(src, base);
  }
  return undefined;
}

function faviconFallback(url: string): string {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=256`;
  } catch {
    return "";
  }
}

async function tryMicrolink(
  url: string,
  apiKey?: string,
  screenshot = false,
): Promise<{ image?: string; title?: string; description?: string }> {
  try {
    const params = new URLSearchParams({ url });
    if (screenshot) {
      params.set("screenshot", "true");
      params.set("meta", "false");
    }
    const res = await fetch(`https://api.microlink.io?${params.toString()}`, {
      headers: apiKey ? { "x-api-key": apiKey } : {},
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return {};
    const json = (await res.json()) as {
      status?: string;
      data?: {
        image?: { url?: string };
        screenshot?: { url?: string };
        title?: string;
        description?: string;
      };
    };
    if (json.status !== "success") return {};
    const image = json.data?.screenshot?.url ?? json.data?.image?.url;
    return {
      image,
      title: json.data?.title,
      description: json.data?.description,
    };
  } catch {
    return {};
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(parseInt(n, 10));
      } catch {
        return "";
      }
    });
}

function extractBodyExcerpt(html: string, max = 500): string | undefined {
  // Prefer <article> or <main> if present
  const article =
    html.match(/<article[\s\S]*?<\/article>/i)?.[0] ??
    html.match(/<main[\s\S]*?<\/main>/i)?.[0] ??
    html;

  const stripped = article
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  const text = decodeEntities(stripped).replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

export async function fetchOg(url: string): Promise<{
  image?: string;
  title?: string;
  description?: string;
  bodyExcerpt?: string;
}> {
  const prefs = getPreferenceValues<Prefs>();
  let html = "";
  let finalUrl = url;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(7000),
      redirect: "follow",
    });
    html = await res.text();
    finalUrl = res.url || url;
  } catch {
    // page unreachable — skip straight to remote fallback
  }

  let image: string | undefined;
  let title: string | undefined;
  let description: string | undefined;
  let bodyExcerpt: string | undefined;

  if (html) {
    image = pickMeta(html, [
      "og:image:secure_url",
      "og:image",
      "twitter:image",
      "twitter:image:src",
    ]);
    if (!image) image = pickLink(html, ["image_src"]);
    if (!image) image = pickFirstContentImage(html, finalUrl);
    if (!image)
      image = pickLink(html, [
        "apple-touch-icon-precomposed",
        "apple-touch-icon",
      ]);
    if (image) image = resolveUrl(image, finalUrl);

    title =
      pickMeta(html, ["og:title", "twitter:title"]) ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();

    description = pickMeta(html, [
      "og:description",
      "twitter:description",
      "description",
    ]);
    if (description) description = decodeEntities(description).trim();

    bodyExcerpt = extractBodyExcerpt(html);
  }

  // Remote fallback for SPAs / blocked pages
  if (!image && prefs.enableScreenshotFallback) {
    const ml = await tryMicrolink(url, prefs.microlinkApiKey, true);
    image = image ?? ml.image;
    title = title ?? ml.title;
    description = description ?? ml.description;
  }

  // Final fallback — always something visual
  if (!image) image = faviconFallback(finalUrl);

  return { image, title, description, bodyExcerpt };
}
