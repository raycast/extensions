import { createNote, resolveVaultId } from "../lib/baalda";

type Input = {
  /**
   * Vault-relative path ending in .md, e.g. "Ideas/draft.md".
   * Every folder in the path must already exist. Use baalda-list-notes
   * or the Browse Vault command to see the structure.
   */
  relPath: string;
  /** Display title (defaults to the filename). */
  title?: string;
  /** Initial markdown content. */
  content?: string;
  /** Vault id from baalda-list-vaults. Omit to use the default/first vault. */
  vaultId?: string;
  /** Optional folder id; must match the directory in relPath. */
  folderId?: string;
};

/** Create a new markdown note in a Baalda vault. */
export default async function tool(input: Input): Promise<string> {
  const vault = await resolveVaultId(input.vaultId);
  const result = await createNote({
    vaultId: vault.vaultId,
    relPath: input.relPath,
    title: input.title,
    folderId: input.folderId,
    content: input.content,
  });
  return JSON.stringify({ vault: vault.name, ...result }, null, 2);
}

export const confirmation = async (input: Input) => ({
  message: `Create note "${input.relPath}" in your Baalda vault?`,
});
