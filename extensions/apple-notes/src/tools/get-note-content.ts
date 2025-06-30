import { getNoteBody } from "../api/applescript";

type Input = {
  /** The ID of the note to get the content of */
  noteId: string;
};

export default async function (input: Input) {
  const note = await getNoteBody(input.noteId);
  return note;
}
