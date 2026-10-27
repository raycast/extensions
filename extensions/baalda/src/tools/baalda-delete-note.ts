import { deleteNote } from "../lib/baalda";

type Input = {
  /** Note docId from baalda-search-notes or baalda-list-notes. */
  docId: string;
};

/** Soft-delete a Baalda note while preserving its edit history. */
export default async function tool(input: Input): Promise<string> {
  const result = await deleteNote(input.docId);
  return JSON.stringify({ ok: true, result }, null, 2);
}

export const confirmation = async (input: Input) => ({
  message: `Delete note "${input.docId}"? Its edit history will be preserved.`,
});
