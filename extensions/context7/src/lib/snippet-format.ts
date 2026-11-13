import type { ContextSnippet } from "./types";

/** One renderer, shared by the detail pane and every copy/paste action, so they can never drift. */
export function renderSnippetMarkdown(snippet: ContextSnippet) {
  return [`# ${snippet.title || "Snippet"}`, "", snippet.content.trim()].join("\n");
}

export function snippetSourceUrl(source?: string) {
  if (!source) {
    return undefined;
  }

  if (source.startsWith("http://") || source.startsWith("https://")) {
    return source;
  }

  if (source.startsWith("/")) {
    return `https://context7.com${source}`;
  }

  return `https://${source}`;
}
