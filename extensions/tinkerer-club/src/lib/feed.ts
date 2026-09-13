import { isJsonObject, unwrapPayload } from "./json";
import { JsonObject, JsonValue } from "../types/api";

export interface ClubAuthor {
  avatarUrl?: string;
  id?: string;
  name: string;
  username?: string;
}

export interface ClubReaction {
  count: number;
  emoji: string;
  viewerReacted: boolean;
}

export interface FeedPost {
  author: ClubAuthor;
  commentCount: number;
  content: string;
  id: string;
  imageUrls?: string[];
  publishedAt?: string;
  raw: JsonValue;
  reactionCount: number;
  reactions: ClubReaction[];
  title?: string;
  topics?: string[];
  type: string;
  url?: string;
  viewerReaction?: string;
}

export interface FeedComment {
  author: ClubAuthor;
  content: string;
  createdAt?: string;
  id: string;
  parentId?: string;
  raw: JsonValue;
  reactionCount: number;
  reactions: ClubReaction[];
  viewerReaction?: string;
}

export interface FeedPage {
  nextCursor?: string;
  posts: FeedPost[];
}

function optionalString(record: JsonObject, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
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

function optionalBoolean(record: JsonObject, keys: readonly string[]): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
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

function parseStringList(value: JsonValue | undefined, keys: readonly string[] = []): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string" && item.trim()) return [item.trim()];
    if (!isJsonObject(item)) return [];
    const text = optionalString(item, keys);
    return text ? [text] : [];
  });
}

function parseImageUrls(record: JsonObject, baseUrl: string): string[] {
  const candidates = [
    optionalString(record, ["metaImageUrl", "imageUrl", "coverImageUrl"]),
    ...parseStringList(record.images, ["url", "imageUrl", "src"]),
  ];
  return [
    ...new Set(
      candidates.flatMap((value) => {
        const resolved = resolveUrl(value, baseUrl);
        return resolved ? [resolved] : [];
      }),
    ),
  ];
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

function viewerReaction(record: JsonObject): string | undefined {
  const direct = optionalString(record, ["viewerReaction", "myReaction", "reactionByMe"]);
  if (direct) return direct;
  const viewer = record.viewerReaction;
  return isJsonObject(viewer) ? optionalString(viewer, ["emoji", "reaction", "value"]) : undefined;
}

function parseReactions(record: JsonObject): ClubReaction[] {
  const value = record.reactions;
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (!isJsonObject(item)) return [];
      const emoji = optionalString(item, ["emoji", "reaction", "value"]);
      if (!emoji) return [];
      return [
        {
          count: optionalNumber(item, ["count", "total"]) ?? 1,
          emoji,
          viewerReacted: optionalBoolean(item, ["viewerReacted", "reactedByMe", "isMine"]) ?? false,
        },
      ];
    });
  }

  if (isJsonObject(value)) {
    return Object.entries(value).flatMap(([emoji, count]) =>
      typeof count === "number" ? [{ count, emoji, viewerReacted: false }] : [],
    );
  }
  return [];
}

function collection(value: JsonValue, keys: readonly string[]): JsonValue[] {
  const payload = unwrapPayload(value);
  if (Array.isArray(payload)) return payload;
  if (!isJsonObject(payload)) return [];
  for (const key of keys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

export function parseFeedPage(value: JsonValue, baseUrl: string): FeedPage {
  const payload = unwrapPayload(value);
  const items = collection(payload, ["items", "posts", "results"]);
  const posts = items.flatMap((item) => {
    if (!isJsonObject(item)) return [];
    const id = optionalString(item, ["id", "postId"]);
    if (!id) return [];
    const author = parseAuthor(item, baseUrl);
    const type = optionalString(item, ["type", "kind"]) ?? "POST";
    const content =
      optionalString(item, ["content", "body", "description", "summary"]) ??
      (type === "MEMBER_JOINED" ? `${author.name} joined Tinkerer Club.` : "");
    const title = optionalString(item, ["title", "headline"]);
    const imageUrls = parseImageUrls(item, baseUrl);
    const topics = [
      ...parseStringList(item.hashtags, ["name", "slug", "label"]),
      ...parseStringList(item.topics, ["name", "slug", "label"]),
    ];
    const publishedAt = optionalString(item, ["publishedAt", "createdAt", "updatedAt"]);
    const reactions = parseReactions(item);
    const ownReaction = viewerReaction(item) ?? reactions.find((reaction) => reaction.viewerReacted)?.emoji;
    const reactionCount = optionalNumber(item, ["reactionCount", "likeCount", "reactionsCount"]);
    const url = resolveUrl(optionalString(item, ["href", "url", "webUrl", "permalink"]), baseUrl);

    return [
      {
        author,
        commentCount: optionalNumber(item, ["commentCount", "commentsCount", "replyCount"]) ?? 0,
        content,
        id,
        ...(imageUrls.length ? { imageUrls } : {}),
        ...(publishedAt ? { publishedAt } : {}),
        raw: item,
        reactionCount: reactionCount ?? reactions.reduce((sum, reaction) => sum + reaction.count, 0),
        reactions,
        ...(title ? { title } : {}),
        ...(topics.length ? { topics: [...new Set(topics)] } : {}),
        type,
        ...(url ? { url } : {}),
        ...(ownReaction ? { viewerReaction: ownReaction } : {}),
      },
    ];
  });

  const nextCursor = isJsonObject(payload)
    ? optionalString(payload, ["nextCursor", "cursor", "nextPageCursor"])
    : undefined;
  return { ...(nextCursor ? { nextCursor } : {}), posts };
}

export function parseFeedPost(value: JsonValue, baseUrl: string): FeedPost | undefined {
  const payload = unwrapPayload(value);
  const candidate = isJsonObject(payload) && isJsonObject(payload.post) ? payload.post : payload;
  return parseFeedPage({ items: [candidate] }, baseUrl).posts[0];
}

export function parseComments(value: JsonValue, baseUrl: string): FeedComment[] {
  return collection(value, ["items", "comments", "results"]).flatMap((item) => {
    if (!isJsonObject(item)) return [];
    const id = optionalString(item, ["id", "commentId"]);
    if (!id) return [];
    const reactions = parseReactions(item);
    const ownReaction = viewerReaction(item) ?? reactions.find((reaction) => reaction.viewerReacted)?.emoji;
    const createdAt = optionalString(item, ["createdAt", "publishedAt", "updatedAt"]);
    const parentId = optionalString(item, ["parentId"]);
    return [
      {
        author: parseAuthor(item, baseUrl),
        content: optionalString(item, ["content", "body", "text"]) ?? "",
        ...(createdAt ? { createdAt } : {}),
        id,
        ...(parentId ? { parentId } : {}),
        raw: item,
        reactionCount:
          optionalNumber(item, ["reactionCount", "likeCount", "reactionsCount"]) ??
          reactions.reduce((sum, reaction) => sum + reaction.count, 0),
        reactions,
        ...(ownReaction ? { viewerReaction: ownReaction } : {}),
      },
    ];
  });
}

export function relativeTime(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

function safeHeading(value: string): string {
  return value.replace(/[\r\n#]/g, " ").trim();
}

export function postTypeLabel(type: string): string {
  if (type === "SHORT") return "Post";
  if (type === "ARTICLE") return "Article";
  if (type === "MEMBER_JOINED") return "New member";
  return type
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ");
}

export function postTypeEmoji(type: string): string {
  if (type === "SHORT") return "💬";
  if (type === "ARTICLE") return "📖";
  if (type === "MEMBER_JOINED") return "👋";
  return "✨";
}

export function isCommentablePost(post: FeedPost): boolean {
  return post.type === "SHORT" || post.type === "ARTICLE";
}

export function reactionSummary(reactions: ClubReaction[], total: number): string | undefined {
  if (reactions.length) {
    return reactions
      .slice(0, 3)
      .map((reaction) => `${reaction.emoji} ${reaction.count}`)
      .join("  ");
  }
  return total > 0 ? `✨ ${total}` : undefined;
}

export function postMarkdown(post: FeedPost): string {
  const heading = post.title ?? `${postTypeEmoji(post.type)} ${postTypeLabel(post.type)}`;
  const body = post.content || "No text content.";
  const images = post.imageUrls?.map((url) => `![](${url})`).join("\n\n") ?? "";
  return `# ${safeHeading(heading)}\n\n${body}${images ? `\n\n${images}` : ""}`;
}

export function commentMarkdown(comment: FeedComment): string {
  return `# 💬 Comment\n\n${comment.content || "No text content."}`;
}
