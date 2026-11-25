import type { RaycastCardLink } from "./apiParsers";
import { getTeakCardUrl } from "./constants";
import { replaceCardLinkTokens } from "./teakCardLinks";

const escapeLinkText = (title: string): string =>
  title.replace(/[\\[\]]/g, "\\$&");

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

/** Links outside code, the ones Teak indexes; tokens in code stay as written. */
export const renderCardLinks = (
  markdown: string,
  links: readonly RaycastCardLink[] = [],
): string =>
  replaceCardLinkTokens(markdown, (storedTitle, id) => {
    const title = titleFor(id, storedTitle, links);
    return links.find((link) => link.id === id)?.missing
      ? `_${title}_`
      : `[${escapeLinkText(title)}](${getTeakCardUrl(id)})`;
  });

export const cardLinksToText = (text: string): string =>
  replaceCardLinkTokens(text, (title) => title.trim() || "Card");

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
