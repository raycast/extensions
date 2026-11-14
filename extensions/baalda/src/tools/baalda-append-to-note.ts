import { appendNote } from "../lib/baalda";

type Input = {
  /** Note docId from baalda-search-notes or baalda-list-notes. */
  docId: string;
  /** Markdown text to append to the end of the note. */
  text: string;
  /** Optional revision from baalda-read-note to guard against concurrent edits. */
  expectedRevision?: string;
};

/** Append markdown to the end of an existing Baalda note. */
export default async function tool(input: Input): Promise<string> {
  const result = await appendNote(input.docId, input.text, {
    idempotencyKey: crypto.randomUUID(),
    expectedRevision: input.expectedRevision,
  });
  return JSON.stringify({ ok: true, result }, null, 2);
}

export const confirmation = async (input: Input) => ({
  message: `Append ${input.text.length} characters to note ${input.docId}?`,
});
