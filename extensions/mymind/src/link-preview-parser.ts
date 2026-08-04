export type LinkPreview = {
  title?: string;
  description?: string;
  siteName?: string;
  imageUrl?: string;
};

function getTagAttributes(tag: string): Map<string, string> {
  const attributes = new Map<string, string>();

  for (const match of tag.matchAll(/([a-zA-Z_:.-]+)\s*=\s*["']([^"']*)["']/g)) {
    const [, name, value] = match;
    attributes.set(name.toLowerCase(), value.trim());
  }

  return attributes;
}

function findMetaContent(html: string, keys: string[]): string | undefined {
  const loweredKeys = new Set(keys.map((key) => key.toLowerCase()));

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = getTagAttributes(match[0]);
    const key = attributes.get("property") ?? attributes.get("name");
    const content = attributes.get("content");

    if (key && content && loweredKeys.has(key.toLowerCase())) {
      return content;
    }
  }

  return undefined;
}

function findLinkHref(html: string, rels: string[]): string | undefined {
  const loweredRels = new Set(rels.map((rel) => rel.toLowerCase()));

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attributes = getTagAttributes(match[0]);
    const rel = attributes.get("rel");
    const href = attributes.get("href");

    if (!rel || !href) {
      continue;
    }

    const relTokens = rel.toLowerCase().split(/\s+/).filter(Boolean);

    if (relTokens.some((token) => loweredRels.has(token))) {
      return href;
    }
  }

  return undefined;
}

function resolveUrl(url: string | undefined, pageUrl: string): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    return new URL(url, pageUrl).toString();
  } catch {
    return undefined;
  }
}

function findTitle(html: string): string | undefined {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch?.[1]?.trim() || undefined;
}

export function parseLinkPreview(html: string, pageUrl: string): LinkPreview {
  const title =
    findMetaContent(html, ["og:title", "twitter:title"]) ?? findMetaContent(html, ["title"]) ?? findTitle(html);
  const description = findMetaContent(html, ["og:description", "twitter:description", "description"]) ?? undefined;
  const siteName = findMetaContent(html, ["og:site_name", "application-name"]) ?? undefined;
  const imageValue =
    findMetaContent(html, ["og:image", "og:image:url", "twitter:image", "twitter:image:src"]) ??
    findLinkHref(html, ["image_src"]);

  return {
    title,
    description,
    siteName,
    imageUrl: resolveUrl(imageValue, pageUrl),
  };
}
