import { listFolders, resolveVaultId } from "../lib/baalda";

type Input = {
  /** Vault id from baalda-list-vaults. Omit to use the default/first vault. */
  vaultId?: string;
};

/** List every folder in a Baalda vault, including each folder's path and parent. */
export default async function tool(input: Input): Promise<string> {
  const vault = await resolveVaultId(input.vaultId);
  const folders = await listFolders(vault.vaultId);
  return JSON.stringify({ vault: vault.name, count: folders?.length ?? 0, folders }, null, 2);
}
