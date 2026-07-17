import { execSQLite } from "../utils";

type Input = {
  /** The ID of the note to read */
  noteId: string;
};

export default async function tool(input: Input) {
  const notes = await execSQLite(`SELECT * FROM notes WHERE id = '${input.noteId}'`);

  if (notes.length === 0) {
    throw new Error("Note not found");
  }

  return notes[0];
}
