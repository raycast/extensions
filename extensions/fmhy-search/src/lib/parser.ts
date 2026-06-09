import type { FmhyCategory, FmhyIndex, FmhyRelatedLink, FmhyRelatedLinkKind, FmhyResult } from "./types";
import {
  getFmhyPageRouteForTopLevelHeading,
  getFmhySectionUrl,
  getFmhyUrlFromRedditWiki,
  slugifyFmhyText,
} from "./fmhy-url";

type ParsedLink = {
  title: string;
  rawUrl: string;
};

type Heading = {
  level: number;
  title: string;
  url?: string;
  pageRoute?: string;
};

type ResourceLine = {
  primaryText?: string;
  descriptionText?: string;
  label?: string;
  isStarred: boolean;
  isIndex: boolean;
  isRedirect: boolean;
  shouldAttachToPrevious: boolean;
};

const MARKDOWN_LINK_START = "[";
const MARKDOWN_LINK_SEPARATOR = "](";

const GENERIC_LINK_TITLES = new Set([
  "codeberg",
  "discord",
  "docs",
  "documentation",
  "facebook",
  "forum",
  "forums",
  "github",
  "gitlab",
  "guide",
  "guides",
  "instagram",
  "mastodon",
  "matrix",
  "note",
  "reddit",
  "source",
  "source code",
  "subreddit",
  "telegram",
  "twitter",
  "video",
  "wiki",
  "x",
  "youtube",
]);

export function parseFmhyMarkdown(markdown: string): FmhyIndex {
  const resultsByKey = new Map<string, FmhyResult>();
  const categoriesByName = new Map<string, FmhyCategory>();
  const headings: Heading[] = [];
  const lastPrimaryResultKeysByCategory = new Map<string, string[]>();
  let currentPageRoute: string | undefined;

  let start = 0;
  while (start < markdown.length) {
    let end = markdown.indexOf("\n", start);
    if (end === -1) end = markdown.length;

    const rawLine = markdown.slice(start, end);
    start = end + 1;

    const line = rawLine.trim();

    if (!line || line.startsWith("<!--") || line === "***") {
      continue;
    }

    const heading = parseHeading(line);
    if (heading) {
      if (heading.level === 1) {
        currentPageRoute = getFmhyPageRouteForTopLevelHeading(heading.title, currentPageRoute) ?? currentPageRoute;
      }

      while (true) {
        const currentHeading = headings.at(-1);
        if (!currentHeading || currentHeading.level < heading.level) {
          break;
        }
        headings.pop();
      }
      headings.push({ ...heading, ...(currentPageRoute ? { pageRoute: currentPageRoute } : {}) });

      const category = formatCategory(headings);
      if (category) {
        upsertCategory(categoriesByName, category, getCategoryUrl(headings));
      }
      continue;
    }

    const category = formatCategory(headings);
    const categoryUrl = getCategoryUrl(headings);
    const categoryKey = category ?? "";

    const note = parseNoteLine(line);
    if (note && category) {
      addCategoryNote(categoriesByName, category, categoryUrl, note);
      continue;
    }

    const resourceLine = parseResourceLine(line);
    if (!resourceLine) {
      continue;
    }

    if (category) {
      upsertCategory(categoriesByName, category, categoryUrl);
    }

    const relatedLinks = getRelatedLinks(resourceLine.descriptionText, resourceLine.label);
    if (resourceLine.shouldAttachToPrevious) {
      const targetKeys = lastPrimaryResultKeysByCategory.get(categoryKey);
      if (targetKeys && relatedLinks.length > 0) {
        for (const targetKey of targetKeys) {
          attachRelatedLinks(resultsByKey, targetKey, relatedLinks);
        }
      }
      continue;
    }

    const links = extractMarkdownLinks(resourceLine.primaryText ?? "");
    if (links.length === 0) {
      continue;
    }

    const producedKeys: string[] = [];
    const resultRelatedLinks = mergeRelatedLinks(relatedLinks, getSecondaryPrimaryLinks(links, resourceLine.label));

    for (const link of links) {
      const normalized = normalizeResultUrl(link.rawUrl, { preferFmhyWiki: resourceLine.isRedirect });
      if (!normalized) {
        continue;
      }

      const title = cleanInlineText(link.title);
      if (!title || shouldSkipResourceTitle(title, links.length)) {
        continue;
      }

      const description = extractDescription(resourceLine.descriptionText);
      const result: FmhyResult = {
        title,
        url: normalized.url,
        ...(category ? { category } : {}),
        ...(categoryUrl ? { categoryUrl } : {}),
        ...(description ? { description } : {}),
        ...(resourceLine.isStarred ? { isStarred: true } : {}),
        ...(resourceLine.isRedirect ? { isRedirect: true } : {}),
        ...(resourceLine.isIndex ? { isIndex: true } : {}),
        ...(resultRelatedLinks.length > 0 ? { relatedLinks: resultRelatedLinks } : {}),
      };

      upsertResult(resultsByKey, normalized.dedupKey, result);
      producedKeys.push(normalized.dedupKey);
    }

    if (producedKeys.length > 0) {
      lastPrimaryResultKeysByCategory.set(categoryKey, producedKeys);
    }
  }

  return {
    results: [...resultsByKey.values()],
    categories: [...categoriesByName.values()],
  };
}

function parseHeading(line: string): Heading | undefined {
  const match = /^(#{1,6})\s+(.+)$/.exec(line);
  if (!match) {
    return undefined;
  }

  const title = cleanHeadingText(match[2] ?? "");
  if (!title) {
    return undefined;
  }

  const headingLink = extractMarkdownLinks(line)[0];
  const normalizedLink = headingLink ? normalizeResultUrl(headingLink.rawUrl, { preferFmhyWiki: true }) : undefined;

  return {
    level: match[1]?.length ?? 1,
    title,
    ...(normalizedLink ? { url: normalizedLink.url } : {}),
  };
}

function parseNoteLine(line: string): string | undefined {
  const listItem = parseListItem(line);
  if (!listItem) {
    return undefined;
  }

  const cleaned = cleanLineText(listItem);
  const note = /^(?:note|notes|warning|tip|important)\s+-\s+(.+)$/i.exec(cleaned)?.[1]?.trim();
  return note ? truncateText(note, 700) : undefined;
}

function parseResourceLine(line: string): ResourceLine | undefined {
  const listItem = parseListItem(line);
  if (!listItem || shouldSkipListItem(listItem)) {
    return undefined;
  }

  const parts = splitResourceDescription(listItem);
  const primaryLinks = extractMarkdownLinks(parts.primary);
  const label = extractLineLabel(parts.primary);
  const descriptionLinks = extractMarkdownLinks(parts.description ?? "");
  const shouldAttachToPrevious =
    primaryLinks.length === 0 && Boolean(label && isAttachmentLabel(label) && descriptionLinks.length > 0);
  const primaryText = primaryLinks.length > 0 ? parts.primary : shouldAttachToPrevious ? undefined : parts.description;

  if (!primaryText && !shouldAttachToPrevious) {
    return undefined;
  }

  return {
    ...(primaryText ? { primaryText } : {}),
    ...(parts.description ? { descriptionText: parts.description } : {}),
    ...(label ? { label } : {}),
    isStarred: hasStarredMarker(listItem),
    isIndex: hasIndexMarker(listItem),
    isRedirect: hasRedirectMarker(listItem),
    shouldAttachToPrevious,
  };
}

function parseListItem(line: string): string | undefined {
  return /^\s*[-*]\s+(.+)$/.exec(line)?.[1]?.trim();
}

function shouldSkipListItem(text: string): boolean {
  return cleanLineText(text).toLocaleLowerCase().includes("back to wiki index");
}

function hasStarredMarker(text: string): boolean {
  return text.trim().startsWith("\u2B50");
}

function hasIndexMarker(text: string): boolean {
  return text.trim().startsWith("\uD83C\uDF10");
}

function hasRedirectMarker(text: string): boolean {
  return text.trim().startsWith("\u21AA");
}

function isAttachmentLabel(label: string): boolean {
  return /^(?:report issues?|.+\s(?:tools?|resources?|addons?|extensions?))$/i.test(label);
}

function extractLineLabel(text: string): string | undefined {
  const label = /^\s*(?:\u2B50|\uD83C\uDF10|\u21AA|\uFE0F|\s)*\s*(?:\*\*([^*]+)\*\*|([^-[\]]+))/.exec(text);
  return cleanInlineText(label?.[1] ?? label?.[2] ?? "");
}

function splitResourceDescription(text: string): { primary: string; description?: string } {
  const match = /^(.+?)\s+-\s+(.+)$/.exec(text);
  if (!match) {
    return { primary: text };
  }

  return {
    primary: match[1]?.trim() ?? "",
    description: match[2]?.trim(),
  };
}

function extractMarkdownLinks(line: string): ParsedLink[] {
  const links: ParsedLink[] = [];
  let cursor = 0;

  while (cursor < line.length) {
    const start = line.indexOf(MARKDOWN_LINK_START, cursor);
    if (start === -1) {
      break;
    }

    if (start > 0 && line[start - 1] === "!") {
      cursor = start + 1;
      continue;
    }

    const separator = line.indexOf(MARKDOWN_LINK_SEPARATOR, start);
    if (separator === -1) {
      break;
    }

    const title = line.slice(start + 1, separator);
    const destinationStart = separator + MARKDOWN_LINK_SEPARATOR.length;
    const destinationEnd = findMarkdownDestinationEnd(line, destinationStart);
    if (destinationEnd === -1) {
      cursor = destinationStart;
      continue;
    }

    links.push({ title, rawUrl: line.slice(destinationStart, destinationEnd) });
    cursor = destinationEnd + 1;
  }

  return links;
}

function findMarkdownDestinationEnd(line: string, start: number): number {
  let nestedParentheses = 0;

  for (let index = start; index < line.length; index += 1) {
    const character = line[index];
    const previousCharacter = index > start ? line[index - 1] : undefined;

    if (character === "(" && previousCharacter !== "\\") {
      nestedParentheses += 1;
      continue;
    }

    if (character === ")" && previousCharacter !== "\\") {
      if (nestedParentheses === 0) {
        return index;
      }

      nestedParentheses -= 1;
    }
  }

  return -1;
}

function normalizeResultUrl(
  rawUrl: string,
  options: { preferFmhyWiki?: boolean } = {},
): { url: string; dedupKey: string } | undefined {
  const markdownUrl = stripMarkdownUrlTitle(rawUrl);
  if (!markdownUrl || markdownUrl.startsWith("#")) {
    return undefined;
  }

  try {
    const parsed = new URL(markdownUrl);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return undefined;
    }

    if (!parsed.hostname) {
      return undefined;
    }

    const fmhyUrl = options.preferFmhyWiki ? getFmhyUrlFromRedditWiki(parsed) : undefined;
    if (fmhyUrl) {
      return normalizeResultUrl(fmhyUrl);
    }

    parsed.hash = parsed.hash === "#" ? "" : parsed.hash;
    const dedupKey = `${parsed.hostname.toLowerCase()}${parsed.pathname}${parsed.search}${parsed.hash}`;

    return { url: parsed.toString(), dedupKey };
  } catch {
    return undefined;
  }
}

function stripMarkdownUrlTitle(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const angleBracketMatch = /^<([^>]+)>/.exec(trimmed);
  if (angleBracketMatch) {
    return angleBracketMatch[1]?.trim() ?? "";
  }

  const titleMatch = /^(\S+)(?:\s+["'(].*)?$/.exec(trimmed);
  return titleMatch?.[1]?.trim() ?? "";
}

function upsertResult(resultsByKey: Map<string, FmhyResult>, key: string, result: FmhyResult): void {
  const existing = resultsByKey.get(key);
  if (!existing) {
    resultsByKey.set(key, result);
    return;
  }

  if (shouldPreferResult(result, existing)) {
    resultsByKey.delete(key);
    resultsByKey.set(key, mergeResult(result, existing));
    return;
  }

  resultsByKey.set(key, mergeResult(existing, result));
}

function shouldPreferResult(candidate: FmhyResult, existing: FmhyResult): boolean {
  if (candidate.url.startsWith("https://") && existing.url.startsWith("http://")) {
    return true;
  }

  if (candidate.isStarred && !existing.isStarred) {
    return true;
  }

  if (candidate.description && !existing.description) {
    return true;
  }

  return false;
}

function mergeResult(preferred: FmhyResult, fallback: FmhyResult): FmhyResult {
  const relatedLinks = mergeRelatedLinks(preferred.relatedLinks, fallback.relatedLinks);

  return {
    ...preferred,
    category: preferred.category ?? fallback.category,
    categoryUrl: preferred.categoryUrl ?? fallback.categoryUrl,
    description: preferred.description ?? fallback.description,
    isStarred: preferred.isStarred || fallback.isStarred || undefined,
    isRedirect: preferred.isRedirect || fallback.isRedirect || undefined,
    isIndex: preferred.isIndex || fallback.isIndex || undefined,
    ...(relatedLinks.length > 0 ? { relatedLinks } : {}),
  };
}

function attachRelatedLinks(
  resultsByKey: Map<string, FmhyResult>,
  targetKey: string,
  relatedLinks: FmhyRelatedLink[],
): void {
  const target = resultsByKey.get(targetKey);
  if (!target) {
    return;
  }

  resultsByKey.set(targetKey, {
    ...target,
    relatedLinks: mergeRelatedLinks(target.relatedLinks, relatedLinks),
  });
}

function mergeRelatedLinks(primary: FmhyRelatedLink[] = [], secondary: FmhyRelatedLink[] = []): FmhyRelatedLink[] {
  const linksByUrl = new Map<string, FmhyRelatedLink>();

  for (const link of [...primary, ...secondary]) {
    linksByUrl.set(link.url, linksByUrl.get(link.url) ?? link);
  }

  return [...linksByUrl.values()];
}

function getRelatedLinks(text: string | undefined, group?: string): FmhyRelatedLink[] {
  if (!text) {
    return [];
  }

  return extractMarkdownLinks(text)
    .map((link) => {
      const normalized = normalizeResultUrl(link.rawUrl, { preferFmhyWiki: true });
      const title = cleanInlineText(link.title);
      if (!normalized || !title) {
        return undefined;
      }

      return {
        title,
        url: normalized.url,
        kind: getRelatedLinkKind(title, normalized.url),
        ...(group ? { group } : {}),
      };
    })
    .filter(isPresent);
}

function getSecondaryPrimaryLinks(links: ParsedLink[], group?: string): FmhyRelatedLink[] {
  if (links.length <= 1) {
    return [];
  }

  return links
    .map((link) => {
      const title = cleanInlineText(link.title);
      if (!title || !shouldSkipResourceTitle(title, links.length)) {
        return undefined;
      }

      const normalized = normalizeResultUrl(link.rawUrl, { preferFmhyWiki: true });
      if (!normalized) {
        return undefined;
      }

      return {
        title,
        url: normalized.url,
        kind: getRelatedLinkKind(title, normalized.url),
        ...(group ? { group } : {}),
      };
    })
    .filter(isPresent);
}

function getRelatedLinkKind(title: string, url: string): FmhyRelatedLinkKind {
  const lowerTitle = title.toLocaleLowerCase();

  try {
    const hostname = new URL(url).hostname.toLocaleLowerCase();
    if (hostname.includes("github.com") || lowerTitle === "github" || lowerTitle === "source code") return "github";
    if (hostname.includes("gitlab.com") || lowerTitle === "gitlab") return "gitlab";
    if (hostname.includes("discord.") || lowerTitle === "discord") return "discord";
    if (
      hostname === "t.me" ||
      hostname.includes("telegram.") ||
      hostname.includes("telegram.me") ||
      lowerTitle === "telegram"
    )
      return "telegram";
    if (
      hostname.includes("x.com") ||
      hostname.includes("twitter.com") ||
      lowerTitle === "x" ||
      lowerTitle === "twitter"
    )
      return "twitter";
    if (hostname.includes("reddit.com") || lowerTitle === "reddit" || lowerTitle === "subreddit") return "reddit";
    if (hostname.includes("fmhy.net")) return "fmhy";
  } catch {
    return "website";
  }

  return lowerTitle.includes("source") ? "source" : "website";
}

function shouldSkipResourceTitle(title: string, linkCount: number): boolean {
  return linkCount > 1 && (GENERIC_LINK_TITLES.has(title.toLocaleLowerCase()) || /^\d+$/.test(title));
}

function formatCategory(headings: Heading[]): string | undefined {
  if (headings.length === 0) {
    return undefined;
  }

  return headings
    .slice(-2)
    .map((heading) => heading.title)
    .join(" / ");
}

function getCategoryUrl(headings: Heading[]): string | undefined {
  if (headings.length === 0) {
    return undefined;
  }

  const currentHeading = headings.at(-1);
  if (currentHeading?.url) {
    return currentHeading.url;
  }

  const root = headings[0];
  if (!root) {
    return undefined;
  }

  if (root.pageRoute) {
    return getFmhySectionUrl(root.pageRoute, currentHeading?.title ?? root.title);
  }

  const rootSlug = slugifyFmhyText(root.title);
  if (!rootSlug) {
    return undefined;
  }

  if (headings.length === 1) {
    return getFmhySectionUrl(rootSlug, root.title);
  }

  return getFmhySectionUrl(rootSlug, currentHeading?.title ?? "");
}

function upsertCategory(categoriesByName: Map<string, FmhyCategory>, name: string, url: string | undefined): void {
  const existing = categoriesByName.get(name);
  if (!existing) {
    categoriesByName.set(name, {
      name,
      ...(url ? { url } : {}),
    });
    return;
  }

  if (url && !existing.url) {
    categoriesByName.set(name, { ...existing, url });
  }
}

function addCategoryNote(
  categoriesByName: Map<string, FmhyCategory>,
  name: string,
  url: string | undefined,
  note: string,
): void {
  const existing = categoriesByName.get(name);
  if (!existing) {
    categoriesByName.set(name, {
      name,
      ...(url ? { url } : {}),
      notes: [note],
    });
    return;
  }

  if (existing.notes?.includes(note)) {
    return;
  }

  categoriesByName.set(name, {
    ...existing,
    ...(url && !existing.url ? { url } : {}),
    notes: [...(existing.notes ?? []), note],
  });
}

function extractDescription(descriptionText: string | undefined): string | undefined {
  if (!descriptionText) {
    return undefined;
  }

  const [plainDescription] = descriptionText.split(/\s+\/\s+(?=\[)/);
  const description = cleanInlineText(plainDescription ?? "");

  return description ? truncateText(description, 240) : undefined;
}

function cleanHeadingText(text: string): string {
  return stripLeadingDecorations(cleanInlineText(text)).trim();
}

function cleanLineText(text: string): string {
  return cleanInlineText(text)
    .replace(/^\s*[-*]\s+/, "")
    .replace(/^(?:\s|\u21aa|\uFE0F|\p{Emoji_Presentation}|\p{Extended_Pictographic})+/u, "")
    .trim();
}

function stripLeadingDecorations(text: string): string {
  return text.replace(
    /^(?:\s|\u25ba|\u25b7|\u25bb|\u25c4|\u21aa|\uFE0F|\p{Emoji_Presentation}|\p{Extended_Pictographic})+/u,
    "",
  );
}

function cleanInlineText(text: string): string {
  return decodeCommonEntities(text)
    .replace(/\p{Cf}/gu, "")
    .replace(/\\([()[\]])/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeCommonEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function isPresent<T>(value: T | undefined): value is T {
  return value !== undefined;
}
