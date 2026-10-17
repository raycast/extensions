import type { SnippetListEntry, ListItem } from "../types";

export function transformSnippets(snippets: SnippetListEntry[]): ListItem[] {
  return snippets.reduce((acc: ListItem[], snippet) => {
    snippet.contents.forEach((content) => {
      acc.push({
        id: `${snippet.id}-${content.id}`,
        snippetId: snippet.id,
        contentId: content.id,
        name: content.label,
        snippetName: snippet.name,
        detail: `${content.label} • ${content.language}`,
        description: `${snippet.folder?.name || "Inbox"}`,
        language: content.language,
      });
    });
    return acc;
  }, []);
}
