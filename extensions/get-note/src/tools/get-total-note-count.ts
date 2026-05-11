import { listNotes } from "../lib/api";

export default async function getTotalNoteCountTool() {
  const data = await listNotes();

  return {
    totalNotes: data.total,
  };
}
