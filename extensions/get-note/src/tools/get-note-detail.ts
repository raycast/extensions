import { getNoteDetail } from "../lib/api";

type Input = {
  /**
   * The GetNote note ID.
   */
  noteId: string;
};

export default async function getNoteDetailTool(input: Input) {
  const note = await getNoteDetail(input.noteId);

  return {
    noteId: note.note_id,
    title: note.title,
    noteType: note.note_type,
    createdAt: note.created_at,
    tags: note.tags?.map((tag) => tag.name) || [],
    summary: note.content,
    sourceUrl: note.web_page?.url,
    sourceExcerpt: note.web_page?.excerpt,
    sourceContent: note.web_page?.content,
  };
}
