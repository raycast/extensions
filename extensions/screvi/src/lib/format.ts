import { Icon, Image } from "@raycast/api";
import { Highlight, SourceType, Tag } from "./screvi";

export function sourceIcon(type: SourceType | undefined): Icon {
  switch (type) {
    case "book":
      return Icon.Book;
    case "podcast":
      return Icon.Microphone;
    case "video":
    case "youtube":
      return Icon.Video;
    case "tweet":
      return Icon.SpeechBubble;
    case "self":
      return Icon.Pencil;
    case "pdf":
      return Icon.Document;
    case "author":
      return Icon.Person;
    case "topics":
      return Icon.Hashtag;
    default:
      return Icon.Globe;
  }
}

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  book: "Book",
  article: "Article",
  tweet: "Tweet",
  self: "Note",
  podcast: "Podcast",
  video: "Video",
  custom: "Custom",
  youtube: "YouTube",
  pdf: "PDF",
  author: "Author",
  topics: "Topic",
};

/** Cover art where the source has it, a type glyph where it doesn't. */
export function coverImage(imageUrl: string | null | undefined, type: SourceType | undefined): Image.ImageLike {
  return imageUrl ? { source: imageUrl, fallback: sourceIcon(type) } : sourceIcon(type);
}

export function tagTint(tag: Tag) {
  return tag.color ?? undefined;
}

/** One line of context under a highlight: author, or the source name when there is no author. */
export function highlightSubtitle(highlight: Highlight): string {
  const source = highlight.source;
  if (!source) return "";
  return source.author ? `${source.name} · ${source.author}` : source.name;
}

export function formatDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toLocaleDateString();
}

/** The detail pane for a highlight: the quote, then its note and metadata. */
export function highlightMarkdown(highlight: Highlight): string {
  const parts = [highlight.content.trim()];
  if (highlight.note) parts.push(`---\n\n**Note**\n\n${highlight.note.trim()}`);
  return parts.join("\n\n");
}

/** What you paste into your own notes: the quote, attributed. */
export function highlightAsMarkdown(highlight: Highlight): string {
  const quote = highlight.content
    .trim()
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  const source = highlight.source;
  if (!source) return quote;

  const attribution = source.author ? `${source.name}, ${source.author}` : source.name;
  const link = source.url ? `[${attribution}](${source.url})` : attribution;
  return `${quote}\n>\n> — ${link}`;
}

/** Collapse a quote to a single line of at most `max` characters. */
export function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}
