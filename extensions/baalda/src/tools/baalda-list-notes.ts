import { listNotes, resolveVaultId } from "../lib/baalda";

type Input = {
  /** Vault id from baalda-list-vaults. Omit to use the default/first vault. */
  vaultId?: string;
  /** Optional folder id to list only that folder's notes. */
  folderId?: string;
};

/**
 * List notes in a Baalda vault (optionally within one folder).
 * Returns each note's docId, title, path and permission.
 */
export default async function tool(input: Input): Promise<string> {
  const vault = await resolveVaultId(input.vaultId);
  const notes = await listNotes(vault.vaultId, input.folderId);
  return JSON.stringify({ vault: vault.name, count: notes?.length ?? 0, notes }, null, 2);
}
