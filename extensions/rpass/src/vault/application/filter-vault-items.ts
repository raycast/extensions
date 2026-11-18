import { ALL_FOLDERS, type VaultItem } from "../domain/vault-item";

function hasFolder(folder: string | undefined): folder is string {
  return Boolean(folder);
}

export function getVaultFolders(items: VaultItem[]): string[] {
  const folders = items.map((item) => item.folder).filter(hasFolder);
  return Array.from(new Set(folders)).sort((a, b) => a.localeCompare(b));
}

export function vaultItemMatchesFolder(
  item: VaultItem,
  selectedFolder: string,
): boolean {
  return selectedFolder === ALL_FOLDERS || item.folder === selectedFolder;
}

export function filterVaultItemsByFolder(
  items: VaultItem[],
  selectedFolder: string,
): VaultItem[] {
  return items.filter((item) => vaultItemMatchesFolder(item, selectedFolder));
}
