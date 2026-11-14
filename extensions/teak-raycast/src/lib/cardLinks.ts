import type { RaycastCardLink } from "./apiParsers";
import { getTeakCardUrl } from "./constants";

// `[[Title|teak:<cardId>]]` links between cards, written in a text card's
// Markdown. The id is the link; the title is only a fallback, since Teak
// shows each target's current title.
const LINK_TOKEN = /\[\[([^\]|\n]{0,200})\|teak:([a-z0-9]{16,64})\]\]/g;
const CODE = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/;

const escapeLinkText = (title: string): string =>
  title.replace(/[\\[\]]/g, "\\$&");

const replaceOutsideCode = (
  markdown: string,
  replace: (segment: string) => string,
): string =>
  markdown
    .split(CODE)
    .map((segment, index) => (index % 2 === 1 ? segment : replace(segment)))
    .join("");

/** The card title shown for a link: its current one, else the stored one. */
const titleFor = (
  id: string,
  storedTitle: string,
  links: readonly RaycastCardLink[],
): string => {
  const linked = links.find((link) => link.id === id);
  if (linked?.missing) {
    return "Missing card";
  }
  return linked?.title?.trim() || storedTitle.trim() || "Card";
};

/**
 * Markdown with each `[[Title|teak:id]]` shown as its card's title, linked to
 * the card in Teak. `links` carries the current titles of the cards linked.
 */
export const renderCardLinks = (
  markdown: string,
  links: readonly RaycastCardLink[] = [],
): string =>
  replaceOutsideCode(markdown, (segment) =>
    segment.replace(LINK_TOKEN, (_match, storedTitle: string, id: string) => {
      const title = titleFor(id, storedTitle, links);
      return links.find((link) => link.id === id)?.missing
        ? `_${title}_`
        : `[${escapeLinkText(title)}](${getTeakCardUrl(id)})`;
    }),
  );

/** Link tokens shown as their stored titles, for one-line previews. */
export const cardLinksToText = (text: string): string =>
  text.replace(LINK_TOKEN, (_match, title: string) => title.trim() || "Card");

/** A "Linked from" list: the cards that link to this one. */
export const backlinksMarkdown = (
  backlinks: readonly RaycastCardLink[],
): string => {
  const visible = backlinks.filter((link) => !link.missing);
  return visible.length === 0
    ? ""
    : `## Linked from\n\n${visible
        .map(
          (link) =>
            `- [${escapeLinkText(link.title?.trim() || "Untitled card")}](${getTeakCardUrl(link.id)})`,
        )
        .join("\n")}`;
};
