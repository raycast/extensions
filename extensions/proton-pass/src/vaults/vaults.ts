export type Vault = { name: string; vaultId: string; shareId: string };
type Source = {
  listVaults(): Promise<Vault[]>;
  createVault(name: string): Promise<Vault>;
  updateVault(vault: Vault, name: string): Promise<void>;
  deleteVault(vault: Vault): Promise<void>;
};
export function createVaults(source: Source) {
  return {
    list: source.listVaults,
    create: source.createVault,
    rename: source.updateVault,
    remove: source.deleteVault,
  };
}
