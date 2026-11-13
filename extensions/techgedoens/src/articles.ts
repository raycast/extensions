import Parser from "rss-parser";
import TurndownService from "turndown";

const FEED_URL = "https://tchgdns.de/feed/";
const SITE_URL = "https://tchgdns.de/";
export const ARTICLES_PER_FEED_PAGE = 15;
export const ARTICLE_COUNT = 9;

type TchgdnsFeed = Record<string, never>;

type TchgdnsFeedItem = {
  title?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  isoDate?: string;
  categories?: string[];
  content?: string;
  contentSnippet?: string;
  description?: string;
  "content:encoded"?: string;
};

export type Article = {
  id: string;
  title: string;
  url: string;
  publishedAt: Date;
  categories: string[];
  excerpt?: string;
  imageUrl?: string;
  contentMarkdown?: string;
};

const parser = new Parser<TchgdnsFeed, TchgdnsFeedItem>({
  customFields: {
    item: ["description", ["content:encoded", "content:encoded"]],
  },
});

const turndownService = new TurndownService({
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "_",
  headingStyle: "atx",
  strongDelimiter: "**",
});
turndownService.remove(["script", "style", "noscript"]);

export async function fetchArticles(limit: number): Promise<Article[]> {
  const pageCount = Math.ceil(limit / ARTICLES_PER_FEED_PAGE);
  const pages = await Promise.all(Array.from({ length: pageCount }, (_, index) => fetchArticleFeedPage(index + 1)));
  const uniqueArticles = new Map<string, Article>();

  for (const article of pages.flat()) {
    if (!uniqueArticles.has(article.id)) {
      uniqueArticles.set(article.id, article);
    }
  }

  return [...uniqueArticles.values()]
    .sort((first, second) => second.publishedAt.getTime() - first.publishedAt.getTime())
    .slice(0, limit);
}

export async function fetchArticleFeedPage(page: number): Promise<Article[]> {
  const url = page === 1 ? FEED_URL : `${FEED_URL}?paged=${page}`;
  return fetchFeedUrl(url, page > 1);
}

export async function fetchArticleSearchPage(query: string, page: number): Promise<Article[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const url = new URL(SITE_URL);
  url.searchParams.set("s", normalizedQuery);
  url.searchParams.set("feed", "rss2");
  if (page > 1) {
    url.searchParams.set("paged", String(page));
  }

  return fetchFeedUrl(url.toString(), page > 1);
}

async function fetchFeedUrl(url: string, allowMissingPage: boolean): Promise<Article[]> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
    },
  });

  if (allowMissingPage && response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`The Techgedoens.de feed returned HTTP ${response.status}.`);
  }

  const xml = await response.text();
  const feed = await parser.parseString(xml);

  return feed.items.flatMap((item) => {
    const article = mapFeedItem(item);
    return article ? [article] : [];
  });
}

function mapFeedItem(item: TchgdnsFeedItem): Article | undefined {
  const title = item.title?.trim();
  const url = item.link?.trim();
  const publishedAt = new Date(item.isoDate ?? item.pubDate ?? "");

  if (!title || !url || Number.isNaN(publishedAt.getTime())) {
    return undefined;
  }

  const fullContent = item["content:encoded"] ?? item.content ?? "";
  const description = item.description ?? item.contentSnippet ?? "";
  const excerpt = createExcerpt(description);

  return {
    id: item.guid?.trim() || url,
    title,
    url,
    publishedAt,
    categories: uniqueStrings(item.categories ?? []),
    excerpt,
    imageUrl: extractFirstImage(fullContent),
    contentMarkdown: createArticleMarkdown(fullContent) || excerpt,
  };
}

function createArticleMarkdown(html: string): string | undefined {
  const articleHtml = removeFeedFooter(html);
  const markdown = turndownService
    .turndown(articleHtml)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return markdown || undefined;
}

function removeFeedFooter(html: string): string {
  const footerMarkers = [
    /<hr\b[^>]*>\s*<p>\s*<a[^>]+href=["'][^"']*amzn\.to\//i,
    /<hr\b[^>]*>\s*<p>\s*<a[^>]+href=["'][^"']*google\.com\/preferences\/source/i,
    /<p>\s*Zum Artikel im Blog:/i,
  ];
  const footerStart = footerMarkers
    .map((marker) => html.search(marker))
    .filter((index) => index >= 0)
    .sort((first, second) => first - second)[0];

  return footerStart === undefined ? html : html.slice(0, footerStart);
}

function createExcerpt(html: string): string | undefined {
  const articleExcerpt = html.split(/<hr\b/i, 1)[0];
  const text = decodeHtmlEntities(articleExcerpt.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

  return text || undefined;
}

function extractFirstImage(html: string): string | undefined {
  const match = html.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  return match ? decodeHtmlEntities(match[1]) : undefined;
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    }
    if (code.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    }
    return namedEntities[code.toLowerCase()] ?? entity;
  });
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
