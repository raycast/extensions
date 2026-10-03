import { moveNote } from "../lib/baalda";

type Input = {
  /** Note docId from baalda-search-notes or baalda-list-notes. */
  docId: string;
  /** New vault-relative path ending in .md. */
  relPath?: string;
  /** New display title. */
  title?: string;
  /** New parent folder id. Omit to leave it unchanged. */
  folderId?: string;
  /** Set true to move the note to the vault root. */
  moveToRoot?: boolean;
};

/** Rename, move, or retitle a Baalda note while preserving its docId and history. */
export default async function tool(input: Input): Promise<string> {
  const result = await moveNote({
    docId: input.docId,
    relPath: input.relPath,
    title: input.title,
    folderId: input.moveToRoot ? null : input.folderId,
  });
  return JSON.stringify({ ok: true, result }, null, 2);
}

export const confirmation = async (input: Input) => ({
  message: `Rename or move note "${input.docId}"?`,
});
