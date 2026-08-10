import { listNotes } from "../lib/api";

/**
 * Count the total number of notes in the user's GetNote account. This is not an API quota or usage-limit check.
 */
export default async function getTotalNoteCountTool() {
  const data = await listNotes();

  return {
    totalNotes: data.total,
  };
}
