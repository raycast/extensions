import type { LeafEventDetail } from "./types";

// Titles, locations, descriptions and guest names come from whoever sent the invite, so Markdown shows them as text
const MARKDOWN_SPECIAL = /[\\`*_{}[\]()#+\-.!|<>~]/g;

const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

/** Text that renders as itself in Markdown: no links, images, HTML or formatting. Line breaks stay. */
export function escapeMarkdown(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(MARKDOWN_SPECIAL, "\\$&").replace(/\n/g, "  \n");
}

/** An event's title and description as Markdown, both shown as plain text. */
export function eventMarkdown(event: Pick<LeafEventDetail, "title" | "description">): string {
  const title = `# ${escapeMarkdown(event.title || "(No title)")}`;
  return event.description.trim() ? `${title}\n\n${escapeMarkdown(event.description.trim())}` : title;
}

export function isEmail(text: string): boolean {
  return EMAIL.test(text);
}
