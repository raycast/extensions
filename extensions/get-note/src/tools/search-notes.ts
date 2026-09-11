import { searchNotes } from "../lib/api";

type Input = {
  /**
   * The query or semantic description to search for in GetNote.
   */
  query: string;
  /**
   * Number of results to return. Defaults to 5.
   */
  topK?: number;
};

export default async function searchNotesTool(input: Input) {
  const results = await searchNotes(input.query, input.topK ?? 5);

  return {
    count: results.length,
    results: results.map((result) => ({
      noteId: result.note_id,
      noteType: result.note_type,
      title: result.title,
      content: result.content,
      createdAt: result.created_at,
      pageNo: result.page_no,
    })),
  };
}
