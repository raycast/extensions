import { getNotes } from "../api/getNotes";

export default async function () {
  const notes = await getNotes();
  return notes;
}
