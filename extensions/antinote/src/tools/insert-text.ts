import { execSQLite } from "../utils";

type Input = {
  /** The ID of the note */
  noteId: string;
  /** The line number to insert the content at (1-indexed) */
  lineNumber: number;
  /** The markdown content to insert */
  content: string;
};

export default async function tool(input: Input) {
  const notes = await execSQLite(`SELECT content FROM notes WHERE id = '${input.noteId}'`);

  if (notes.length === 0) {
    throw new Error("Note not found");
  }

  const noteContent = notes[0].content;
  const lines = noteContent.split("\n");

  const insertIndex = Math.max(0, Math.min(input.lineNumber - 1, lines.length));
  lines.splice(insertIndex, 0, input.content);

  const newContent = lines.join("\n");
  const now = new Date().toISOString();

  const escapedContent = newContent.replace(/'/g, "''");

  await execSQLite(
    `UPDATE notes SET content = '${escapedContent}', lastModified = '${now}' WHERE id = '${input.noteId}'`,
  );

  return "Text inserted successfully.";
}
