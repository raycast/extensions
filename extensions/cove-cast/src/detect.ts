import type { ChainType } from "./cove";

/**
 * Clipboard contract-address extraction and Dexscreener-based chain detection.
 */

// Exactly 40 hex chars, not part of a longer hex run — so a 64-hex transaction
// hash is rejected rather than mis-read as the first 40 chars of an address.
const EVM_RE = /(?<![a-fA-F0-9])0x[a-fA-F0-9]{40}(?![a-fA-F0-9])/;
// base58 (excludes 0 O I l)
const SOLANA_RE = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/;

export type ExtractedAddress = { ca: string; type: ChainType };

/**
 * Extract the first contract address from possibly-noisy text. EVM is checked
 * first so that when both kinds appear the result is deterministically EVM.
 */
export function extractContractAddress(
  text: string | null | undefined,
): ExtractedAddress | null {
  if (!text) return null;
  const evm = text.match(EVM_RE);
  if (evm) return { ca: evm[0], type: "evm" };
  const sol = text.match(SOLANA_RE);
  if (sol) return { ca: sol[0], type: "solana" };
  return null;
}

export type ChainLiquidity = { chainId: string; liquidityUsd: number };

export type TokenInfo = {
  symbol?: string;
  name?: string;
  chains: ChainLiquidity[];
};

type DexToken = { address?: string; symbol?: string; name?: string };
type DexPair = {
  chainId?: string;
  baseToken?: DexToken;
  quoteToken?: DexToken;
  liquidity?: { usd?: number };
};

/**
 * Reduce a Dexscreener `/tokens/{ca}` response into the token symbol/name and a
 * per-chain liquidity total, sorted by liquidity descending.
 */
export function parseDexscreenerTokens(json: unknown, ca: string): TokenInfo {
  const pairs: DexPair[] = Array.isArray((json as { pairs?: unknown })?.pairs)
    ? (json as { pairs: DexPair[] }).pairs
    : [];

  const liquidityByChain = new Map<string, number>();
  let symbol: string | undefined;
  let name: string | undefined;
  const target = ca.toLowerCase();

  for (const pair of pairs) {
    if (!pair?.chainId) continue;
    const usd =
      typeof pair.liquidity?.usd === "number" ? pair.liquidity.usd : 0;
    liquidityByChain.set(
      pair.chainId,
      (liquidityByChain.get(pair.chainId) ?? 0) + usd,
    );

    if (!symbol) {
      const match = [pair.baseToken, pair.quoteToken].find(
        (t) => t?.address?.toLowerCase() === target,
      );
      const token = match ?? pair.baseToken;
      if (token?.symbol) {
        symbol = token.symbol;
        name = token.name;
      }
    }
  }

  const chains: ChainLiquidity[] = Array.from(liquidityByChain.entries())
    .map(([chainId, liquidityUsd]) => ({ chainId, liquidityUsd }))
    .sort((a, b) => b.liquidityUsd - a.liquidityUsd);

  return { symbol, name, chains };
}

/**
 * Fetch chain detection for a contract address from Dexscreener with a timeout.
 * Thin glue over {@link parseDexscreenerTokens}; throws on network/timeout/HTTP error.
 */
export async function detectChains(
  ca: string,
  timeoutMs = 3000,
): Promise<TokenInfo> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${ca}`,
      {
        signal: controller.signal,
      },
    );
    if (!res.ok) throw new Error(`Dexscreener returned ${res.status}`);
    const json = await res.json();
    return parseDexscreenerTokens(json, ca);
  } finally {
    clearTimeout(timer);
  }
}
