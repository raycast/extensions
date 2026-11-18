import { toVaultItem, type VaultItem } from "../domain/vault-item";

interface LoadVaultItemsDependencies {
  listEntries(storepath: string): Promise<string[]>;
}

export async function loadVaultItems(
  storepath: string,
  deps: LoadVaultItemsDependencies,
): Promise<VaultItem[]> {
  const entries = await deps.listEntries(storepath);
  return entries.map(toVaultItem);
}
