import { Icon, Image } from "@raycast/api";
import { PARENT_CATEGORY_IDS } from "./categories";
import type { Post } from "./types";
import { decodeHtmlEntities, formatDate, stripHtml } from "./utils";

export function getPostMeta(post: Post) {
  const title = decodeHtmlEntities(post.title.rendered);
  const excerpt = stripHtml(decodeHtmlEntities(post.excerpt?.rendered ?? ""));
  const thumbnail = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
  const author = post._embedded?.author?.[0];
  const dateStr = formatDate(post.date);

  const allCats = post._embedded?.["wp:term"]?.[0] ?? [];
  const primaryCat =
    allCats.find(
      (t) => t.taxonomy === "category" && !PARENT_CATEGORY_IDS.has(t.id),
    ) ?? allCats.find((t) => t.taxonomy === "category");

  const detailMarkdown = excerpt ? `## ${title}\n\n${excerpt}` : `## ${title}`;

  return {
    title,
    excerpt,
    thumbnail,
    author,
    dateStr,
    primaryCat,
    detailMarkdown,
  };
}

export function postCover(thumbnail: string | undefined) {
  return thumbnail ?? Icon.Document;
}

export function authorAvatarIcon(author?: {
  name: string;
  avatar_urls?: Record<string, string>;
}) {
  const url = author?.avatar_urls?.["48"] ?? author?.avatar_urls?.["96"];
  if (url) {
    return { source: url, mask: Image.Mask.Circle };
  }
  return Icon.Person;
}
