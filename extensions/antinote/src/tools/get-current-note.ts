import { execSQLite } from "../utils";

export default async function tool() {
  const notes = await execSQLite(`SELECT * FROM notes ORDER BY lastModified DESC LIMIT 1`);

  if (notes.length === 0) {
    throw new Error("No notes found");
  }

  return notes[0];
}
