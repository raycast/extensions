import { parseInput, SolType } from "./inputParser";
import { preferences } from "./preferences";

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
}

const explorerSettings = new Map<SolanaExplorer, SolanaExplorerValues>([
  [
    SolanaExplorer.SOLSCAN,
    {
      base: "https://solscan.io/",
      transaction: "tx",
      address: "address",
      block: "block",
    },
  ],
  [
    SolanaExplorer.SOLANA_EXPLORER,
    {
      base: "https://explorer.solana.com/",
      transaction: "tx",
      address: "address",
      block: "block",
    },
  ],
  [
    SolanaExplorer.SOLANA_BEACH,
    {
      base: "https://solanabeach.io/",
      transaction: "transaction",
      address: "address",
      block: "block",
    },
  ],
  [
    SolanaExplorer.SOLANA_FM,
    {
      base: "https://solana.fm/",
      transaction: "tx",
      address: "address",
      block: "block",
    },
  ],
]);

/**
 * Resolve input into URL.
 * Use explorer from preferences.
 * @param input transaction, address, or block
 */
export function resolveUrl(input: string): string | undefined {
  const solType = parseInput(input);
  const explorer = preferences().explorer;
  const settings = explorerSettings.get(explorer);

  if (settings === undefined || solType == SolType.UNKNOWN) {
    return undefined;
  }

  let typeParameter;
  switch (solType) {
    case SolType.TRANSACTION:
      typeParameter = settings.transaction;
      break;
    case SolType.ADDRESS:
      typeParameter = settings.address;
      break;
    case SolType.BLOCK:
      typeParameter = settings.block;
      break;
  }

  return settings.base + typeParameter + "/" + input;
}
