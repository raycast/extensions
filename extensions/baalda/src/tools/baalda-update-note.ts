import { updateNote } from "../lib/baalda";

type Input = {
  /** Note docId from baalda-search-notes or baalda-list-notes. */
  docId: string;
  /** The complete replacement markdown content. */
  content: string;
  /** Optional revision from baalda-read-note to guard against concurrent edits. */
  expectedRevision?: string;
};

/** Replace a Baalda note's entire markdown content. */
export default async function tool(input: Input): Promise<string> {
  const result = await updateNote(input);
  return JSON.stringify({ ok: true, result }, null, 2);
}

export const confirmation = async (input: Input) => ({
  message: `Replace the full content of note ${input.docId}${input.expectedRevision ? " using the supplied revision guard" : ""}?`,
});
