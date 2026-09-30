import type { Snippet, ListItem } from "../types";

export function transformSnippets(snippets: Snippet[]): ListItem[] {
  return snippets.reduce((acc: ListItem[], snippet) => {
    snippet.contents.forEach((content) => {
      acc.push({
        id: content.id,
        name: content.label,
        snippetName: snippet.name,
        detail: `${content.label} • ${content.language}`,
        description: `${snippet.folder?.name || "Inbox"}`,
        value: content.value ?? "",
        language: content.language,
      });
    });
    return acc;
  }, []);
}
