import { createFolder, resolveVaultId } from "../lib/baalda";

type Input = {
  /** Folder name. */
  name: string;
  /** Vault-relative folder path, e.g. "Ideas/Drafts". */
  path: string;
  /** Vault id from baalda-list-vaults. Omit to use the default/first vault. */
  vaultId?: string;
  /** Optional parent folder id. */
  parentId?: string;
};

/** Create a folder in a Baalda vault. */
export default async function tool(input: Input): Promise<string> {
  const vault = await resolveVaultId(input.vaultId);
  const result = await createFolder({
    vaultId: vault.vaultId,
    name: input.name,
    path: input.path,
    parentId: input.parentId,
  });
  return JSON.stringify({ vault: vault.name, ...result }, null, 2);
}

export const confirmation = async (input: Input) => ({
  message: `Create folder "${input.path}" in your Baalda vault?`,
});
