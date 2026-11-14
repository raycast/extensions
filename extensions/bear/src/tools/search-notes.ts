import { loadDatabase } from "../bear-db";

export default async function (input: {
  /**
   * The text to search for. If there is no text, pass an empty string.
   */
  text: string;

  /**
   * The tag assigned to the note. Tag can also be in the form of '#tag' where '#' is removed when passing input.
   */
  tag?: string;
}) {
  const db = await loadDatabase();
  const notes = db.getNotes(input.text || "", input.tag);
  // imagePaths are local file paths for rendering previews; the model has no use for them
  return notes.map((note) => ({ ...note, imagePaths: undefined }));
}
