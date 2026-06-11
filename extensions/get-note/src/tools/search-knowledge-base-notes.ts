import { searchKnowledgeBaseNotes } from "../lib/api";

type Input = {
  /**
   * The knowledge base topic ID.
   */
  topicId: string;
  /**
   * The semantic query to search for within the knowledge base.
   */
  query: string;
  /**
   * Number of results to return. Defaults to 5.
   */
  topK?: number;
};

export default async function searchKnowledgeBaseNotesTool(input: Input) {
  const results = await searchKnowledgeBaseNotes(input.topicId, input.query, input.topK ?? 5);

  return {
    topicId: input.topicId,
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
