import { searchNotes } from "../lib/api";
import { cleanHighlight } from "../lib/api-core";
type Input = {
  /** Search text, matched against note titles and content. */
  query: string;
  /** Optional folder ID, not a folder name. */
  folderId?: string;
  /** Number of matches to return, between 1 and 100. Default: 20. */
  limit?: number;
};
export default async function tool(input: Input) {
  const result = await searchNotes(input.query, input.folderId, input.limit ?? 20);
  return {
    notes: result.data.map((note) => ({
      ...note,
      title: cleanHighlight(note.title),
      snippet: cleanHighlight(note.snippet ?? ""),
    })),
    total: result.meta?.total ?? result.data.length,
    truncated: (result.meta?.total ?? 0) > result.data.length,
  };
}
