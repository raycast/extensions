import { base58 } from "@scure/base";

const coins: Record<string, IsValidTxHash> = {
  Solana: solIsValidTxHash,
};

export function isValidTxHash(coin: string, query: string) {
  const isValid = coins[coin] || defaultIsValidTxHash;
  return isValid(query) ? "transaction" : "address";
}

const SOL_TX_HASH_BYTES = 64;

function solIsValidTxHash(query: string) {
  try {
    const length = base58.decode(query).length;
    return length === SOL_TX_HASH_BYTES;
  } catch {
    return false;
  }
}

const DEFAULT_TX_HASH_REGEX = /^[0-9a-fA-F]{64}$/;

function defaultIsValidTxHash(query: string) {
  const newQuery = query.startsWith("0x") ? query.slice(2) : query;
  return DEFAULT_TX_HASH_REGEX.test(newQuery);
}

type IsValidTxHash = (query: string) => boolean;
