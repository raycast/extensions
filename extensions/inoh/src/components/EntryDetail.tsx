import { List } from "@raycast/api";
import { getImageUrl } from "../lib/storage";
import type { DictionaryEntry } from "../types";

/**
 * Renders a dictionary entry as detail markdown: word, definition, image
 * (when available), and example sentence.
 */
function _buildEntryMarkdown(entry: DictionaryEntry): string {
  const imageUrl = getImageUrl(entry.image_path);
  const imageSection = imageUrl ? `\n\n---\n\n<img src="${imageUrl}" alt="${entry.word}" width="360" />` : "";

  return `## ${entry.word}\n\n${entry.definition}${imageSection}\n\n*"${entry.example_sentence}"*`;
}

/** Detail pane shown next to a dictionary search result. */
export function EntryDetail({ entry, isLoading }: { entry: DictionaryEntry; isLoading: boolean }) {
  return <List.Item.Detail isLoading={isLoading} markdown={_buildEntryMarkdown(entry)} />;
}
