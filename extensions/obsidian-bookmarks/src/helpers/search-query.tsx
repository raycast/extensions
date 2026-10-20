import { File } from "../types";

export type SearchQuery = {
  /** The search terms, with every `#tag` token removed. */
  text: string;
  /** Tags the results should be filtered by. */
  tags: string[];
  /** The `#tag` token currently being typed, if any. */
  pendingTag: string | null;
};

export function parseSearchQuery(search: string): SearchQuery {
  const tokens = search.split(/\s+/).filter(Boolean);
  const lastToken = /\s$/.test(search) ? undefined : tokens[tokens.length - 1];

  return {
    text: tokens.filter((token) => !token.startsWith("#")).join(" "),
    tags: tokens.filter((token) => token.startsWith("#") && token.length > 1).map((token) => token.slice(1)),
    pendingTag: lastToken?.startsWith("#") ? lastToken.slice(1) : null,
  };
}

export function matchesTags(file: File, tags: string[]): boolean {
  const fileTags = file.attributes.tags.map((tag) => tag.toLowerCase());
  return tags.every((tag) => fileTags.some((fileTag) => fileTag.startsWith(tag.toLowerCase())));
}

export function completeTag(search: string, tag: string): string {
  return `${search.replace(/#\S*$/, "")}#${tag} `;
}
