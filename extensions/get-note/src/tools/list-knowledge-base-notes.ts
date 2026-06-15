import { listKnowledgeBaseNotes } from "../lib/api";

type Input = {
  /**
   * The knowledge base topic ID.
   */
  topicId: string;
  /**
   * Page number, starting from 1.
   */
  page?: number;
};

export default async function listKnowledgeBaseNotesTool(input: Input) {
  const page = input.page ?? 1;
  const data = await listKnowledgeBaseNotes(input.topicId, page);

  return {
    topicId: input.topicId,
    page,
    count: data.notes?.length || 0,
    hasMore: data.has_more,
    notes: (data.notes || []).map((note) => ({
      noteId: note.note_id,
      title: note.title,
      content: note.content,
      noteType: note.note_type,
      tags: note.tags?.map((tag) => tag.name) || [],
      createdAt: note.created_at,
      editedAt: note.edit_time,
    })),
  };
}
