export interface Vault {
  name: string;
  key: string;
  path: string;
}

export interface ObsidianVaultsState {
  ready: boolean;
  vaults: Vault[];
}

interface ObsidianVaultJSON {
  path: string;
  ts: number;
  open: boolean;
}

export interface ObsidianJSON {
  vaults: Record<string, ObsidianVaultJSON>;
}
