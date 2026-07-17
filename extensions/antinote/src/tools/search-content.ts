import { execSQLite } from "../utils";

type Input = {
  /** The text string to search for within the notes */
  searchString: string;
};

export default async function tool(input: Input) {
  const escapedSearch = input.searchString.replace(/'/g, "''");
  const query = `
    SELECT id, content, created, lastModified 
    FROM notes 
    WHERE content LIKE '%${escapedSearch}%' 
    ORDER BY lastModified DESC
  `;
  const notes = await execSQLite(query);

  return notes;
}
