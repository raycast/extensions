import { isJsonObject, unwrapPayload } from "./json";
import { ClubAuthor } from "./feed";
import { JsonObject, JsonValue } from "../types/api";

export interface ClubArticle {
  author: ClubAuthor;
  content?: string;
  coverUrl?: string;
  excerpt?: string;
  id: string;
  isDraft: boolean;
  publishedAt?: string;
  raw: JsonValue;
  readingTimeMinutes?: number;
  slug?: string;
  title: string;
  topics: string[];
  url?: string;
}

function optionalString(record: JsonObject, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function optionalNumber(record: JsonObject, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function resolveUrl(value: string | undefined, baseUrl: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, `${baseUrl}/`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function stringList(value: JsonValue | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string" && item.trim()) return [item.trim()];
    if (!isJsonObject(item)) return [];
    const label = optionalString(item, ["name", "label", "slug", "title"]);
    return label ? [label] : [];
  });
}

function collection(value: JsonValue): JsonValue[] {
  const payload = unwrapPayload(value);
  if (Array.isArray(payload)) return payload;
  if (!isJsonObject(payload)) return [];
  for (const key of ["items", "articles", "posts", "results", "drafts"]) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function parseAuthor(record: JsonObject, baseUrl: string): ClubAuthor {
  const nested = [record.author, record.user, record.member].find(isJsonObject);
  const source = nested ?? record;
  const name =
    optionalString(source, ["name", "displayName", "username"]) ??
    optionalString(record, ["authorName", "username"]) ??
    "Tinkerer";
  const id = optionalString(source, ["id", "userId"]);
  const username = optionalString(source, ["username", "handle"]);
  const avatarUrl = resolveUrl(optionalString(source, ["avatarUrl", "avatarImageUrl", "avatar", "imageUrl"]), baseUrl);
  return {
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(id ? { id } : {}),
    name,
    ...(username ? { username } : {}),
  };
}

export function parseArticle(value: JsonValue, baseUrl: string, isDraft = false): ClubArticle | undefined {
  const payload = unwrapPayload(value);
  const candidate =
    isJsonObject(payload) && isJsonObject(payload.article)
      ? payload.article
      : isJsonObject(payload) && isJsonObject(payload.post)
        ? payload.post
        : payload;
  if (!isJsonObject(candidate)) return undefined;

  const id = optionalString(candidate, ["id", "postId"]);
  const title = optionalString(candidate, ["title", "headline"]);
  if (!id || !title) return undefined;

  const content = optionalString(candidate, ["content", "body", "markdown"]);
  const excerpt = optionalString(candidate, ["contentPreview", "excerpt", "summary", "description"]);
  const publishedAt = optionalString(candidate, ["publishedAt", "createdAt", "updatedAt"]);
  const coverUrl = resolveUrl(optionalString(candidate, ["metaImageUrl", "coverImageUrl", "imageUrl"]), baseUrl);
  const returnedUrl = resolveUrl(optionalString(candidate, ["href", "url", "webUrl", "permalink"]), baseUrl);
  const url =
    returnedUrl ?? (!isDraft ? new URL(`/posts/${encodeURIComponent(id)}`, `${baseUrl}/`).toString() : undefined);
  const slug = optionalString(candidate, ["slug"]);
  const topics = [...new Set([...stringList(candidate.topics), ...stringList(candidate.hashtags)])];
  const readingTimeMinutes = optionalNumber(candidate, [
    "readingTimeMinutes",
    "readTimeMinutes",
    "readingTime",
    "readTime",
    "minutesToRead",
  ]);

  return {
    author: parseAuthor(candidate, baseUrl),
    ...(content ? { content } : {}),
    ...(coverUrl ? { coverUrl } : {}),
    ...(excerpt ? { excerpt } : {}),
    id,
    isDraft,
    ...(publishedAt ? { publishedAt } : {}),
    raw: candidate,
    ...(readingTimeMinutes ? { readingTimeMinutes } : {}),
    ...(slug ? { slug } : {}),
    title,
    topics,
    ...(url ? { url } : {}),
  };
}

export function parseArticles(value: JsonValue, baseUrl: string, isDraft = false): ClubArticle[] {
  return collection(value).flatMap((item) => {
    const article = parseArticle(item, baseUrl, isDraft);
    return article ? [article] : [];
  });
}

function safeHeading(value: string): string {
  return value.replace(/[\r\n#]/g, " ").trim();
}

export function articleMarkdown(article: ClubArticle): string {
  const image = article.coverUrl ? `![](${article.coverUrl})\n\n` : "";
  const body = article.content ?? article.excerpt ?? "Open the article to load its full content.";
  return `${image}# ${safeHeading(article.title)}\n\n${body}`;
}

export function mergeArticle(summary: ClubArticle, detail: ClubArticle | undefined): ClubArticle {
  if (!detail) return summary;
  return {
    ...summary,
    ...detail,
    author: detail.author.name === "Tinkerer" ? summary.author : detail.author,
    topics: detail.topics.length ? detail.topics : summary.topics,
  };
}
