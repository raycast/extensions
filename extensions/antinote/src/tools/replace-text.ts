import { execSQLite } from "../utils";

type Input = {
  /** The ID of the note */
  noteId: string;
  /** The old string to be replaced */
  oldString: string;
  /** The new markdown content to replace with */
  newString: string;
};

export default async function tool(input: Input) {
  const notes = await execSQLite(`SELECT content FROM notes WHERE id = '${input.noteId}'`);

  if (notes.length === 0) {
    throw new Error("Note not found");
  }

  const noteContent = notes[0].content as string;
  if (!noteContent.includes(input.oldString)) {
    throw new Error("Old string not found in note");
  }

  const newContent = noteContent.replace(input.oldString, input.newString);
  const now = new Date().toISOString();

  const escapedContent = newContent.replace(/'/g, "''");

  await execSQLite(
    `UPDATE notes SET content = '${escapedContent}', lastModified = '${now}' WHERE id = '${input.noteId}'`,
  );

  return "Text replaced successfully.";
}
