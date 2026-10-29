import { readNote } from "../lib/baalda";

type Input = {
  /** Note docId from baalda-search-notes or baalda-list-notes. */
  docId: string;
};

/**
 * Read a Baalda note's full markdown content by docId.
 * The response includes a `revision`. Quote it back when updating so
 * writes are refused if the note changed in between.
 */
export default async function tool(input: Input): Promise<string> {
  const note = await readNote(input.docId);
  return JSON.stringify(note, null, 2);
}
