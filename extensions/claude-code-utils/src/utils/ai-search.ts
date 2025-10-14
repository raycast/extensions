import { ParsedMessage, Snippet } from "./claude-message";

/**
 * Normal (keyword) search for messages
 * Searches message content and preview for the given query
 */
export function normalSearch(
  messages: ParsedMessage[],
  searchText: string,
): ParsedMessage[] {
  if (!searchText.trim()) {
    return messages;
  }

  const query = searchText.toLowerCase();
  return messages.filter(
    (msg) =>
      msg.content.toLowerCase().includes(query) ||
      msg.preview.toLowerCase().includes(query),
  );
}

/**
 * Normal (keyword) search for snippets
 * Searches snippet title and content for the given query
 */
export function normalSearchSnippets(
  snippets: Snippet[],
  searchText: string,
): Snippet[] {
  if (!searchText.trim()) {
    return snippets;
  }

  const query = searchText.toLowerCase();
  return snippets.filter(
    (snippet) =>
      snippet.title.toLowerCase().includes(query) ||
      snippet.content.toLowerCase().includes(query),
  );
}
