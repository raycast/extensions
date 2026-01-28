import { preferences } from "./preferences";

export enum SolType {
  TRANSACTION = "Transaction",
  ADDRESS = "Address",
  BLOCK = "Block",
  TOKEN = "Token",
}

/**
 * Enum with Solana explorers
 */
export enum SolanaExplorer {
  SOLSCAN = "SOLSCAN",
  SOLANA_EXPLORER = "SOLANA_EXPLORER",
  SOLANA_FM = "SOLANA_FM",
  SOLANA_BEACH = "SOLANA_BEACH",
}

/**
 * Type for SolanaExplorer's values
 */
interface SolanaExplorerValues {
  base: string;
  transaction: string;
  address: string;
  block: string;
  token: string;
}

const explorerSettings: Record<SolanaExplorer, SolanaExplorerValues> = {
  [SolanaExplorer.SOLSCAN]: {
    base: "https://solscan.io/",
    transaction: "tx",
    address: "address",
    block: "block",
    token: "token",
  },

  [SolanaExplorer.SOLANA_EXPLORER]: {
    base: "https://explorer.solana.com/",
    transaction: "tx",
    address: "address",
    block: "block",
    token: "address",
  },

  [SolanaExplorer.SOLANA_BEACH]: {
    base: "https://solanabeach.io/",
    transaction: "transaction",
    address: "address",
    block: "block",
    token: "token",
  },

  [SolanaExplorer.SOLANA_FM]: {
    base: "https://solana.fm/",
    transaction: "tx",
    address: "address",
    block: "block",
    token: "address",
  },
};

/**
 * Resolve input into URL.
 * Use explorer from preferences.
 * @param input transaction, address, or block
 */
export function resolveUrl(input: string, type: SolType, cluster: string): string {
  const explorer = preferences().explorer;
  const settings = explorerSettings[explorer];

  let typeParameter;
  switch (type) {
    case SolType.TRANSACTION:
      typeParameter = settings.transaction;
      break;
    case SolType.ADDRESS:
      typeParameter = settings.address;
      break;
    case SolType.BLOCK:
      typeParameter = settings.block;
      break;
    case SolType.TOKEN:
      typeParameter = settings.token;
      break;
  }

  return `${settings.base}${typeParameter}/${input}?cluster=${cluster}`;
}
