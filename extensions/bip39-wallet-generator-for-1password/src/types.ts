export interface WalletResult {
  mnemonic: string;
  chains: {
    evm: { path: string; address: string };
    btc: { type: string; path: string; address: string };
    sol: { path: string; address: string };
  };
}

export interface SavedItem {
  id: string;
  title: string;
  vault: string;
  url?: string;
}

export interface Vault {
  id: string;
  name: string;
}
