const NOTION_ID_PATTERN = /([a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})/i;
const GENERIC_NOTION_TITLE_PATTERNS = [/workspace that works for you\.?$/i, /with ai at your side\.?$/i];

export function extractNotionId(input: string): string | null {
  const value = input.trim();

  if (!value) {
    return null;
  }

  const match = value.match(NOTION_ID_PATTERN);
  return match ? match[0].replace(/-/g, "").toLowerCase() : null;
}

export function isNotionUrl(input: string): boolean {
  const value = input.trim();

  if (!value) {
    return false;
  }

  try {
    const { hostname } = new URL(value);
    return (
      hostname === "notion.so" ||
      hostname.endsWith(".notion.so") ||
      hostname === "notion.site" ||
      hostname.endsWith(".notion.site")
    );
  } catch {
    return false;
  }
}

function humanizeSlug(value: string): string {
  return value.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

export function derivePageNameFromNotionUrl(input: string): string | null {
  if (!isNotionUrl(input)) {
    return null;
  }

  try {
    const url = new URL(input.trim());
    const lastSegment = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
    const withoutId = lastSegment
      .replace(/[-_]?(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i, "")
      .trim();
    const pageName = humanizeSlug(withoutId);
    return pageName || null;
  } catch {
    return null;
  }
}

export function normalizeNotionPageTitle(title: string): string | null {
  const cleaned = title
    .trim()
    .replace(/\s+[|:-]\s+Notion$/i, "")
    .replace(/\s+[|:-]\s+Private$/i, "")
    .trim();

  if (
    !cleaned ||
    /^notion$/i.test(cleaned) ||
    /^notion page [a-f0-9]{8}$/i.test(cleaned) ||
    GENERIC_NOTION_TITLE_PATTERNS.some((pattern) => pattern.test(cleaned))
  ) {
    return null;
  }

  return cleaned;
}

export function resolveNotionPageName(options: {
  notionId: string;
  sourceUrl?: string | null;
  title?: string | null;
}): string {
  const fromTitle = options.title ? normalizeNotionPageTitle(options.title) : null;
  if (fromTitle) {
    return fromTitle;
  }

  const fromUrl = options.sourceUrl ? derivePageNameFromNotionUrl(options.sourceUrl) : null;
  if (fromUrl) {
    return fromUrl;
  }

  return `Notion Page ${options.notionId.slice(0, 8)}`;
}
