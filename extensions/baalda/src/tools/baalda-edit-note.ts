import { editNote, type NoteEdit } from "../lib/baalda";

type Input = {
  /** Note docId from baalda-search-notes or baalda-list-notes. */
  docId: string;
  /**
   * JSON-encoded array of edits. Each item uses the API shape:
   * {"type":"replace","find":"old","replace":"new"}.
   */
  edits: string;
  /** Optional revision from baalda-read-note to guard against concurrent edits. */
  expectedRevision?: string;
};

function parseEdits(value: string): NoteEdit[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("edits must be valid JSON containing an array of edit objects");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("edits must be a JSON array of edit objects");
  }
  return parsed as NoteEdit[];
}

/** Make targeted exact-text edits to a Baalda note. */
export default async function tool(input: Input): Promise<string> {
  const result = await editNote({
    docId: input.docId,
    edits: parseEdits(input.edits),
    expectedRevision: input.expectedRevision,
  });
  return JSON.stringify({ ok: true, result }, null, 2);
}

export const confirmation = async (input: Input) => ({
  message: `Apply the supplied targeted edits to note ${input.docId}?`,
});
