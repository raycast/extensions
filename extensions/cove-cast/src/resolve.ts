import { coveChainCode } from "./cove";
import type { ExtractedAddress, TokenInfo } from "./detect";

/**
 * Pure chain-resolution shared by the Buy view and the Quick Buy command.
 *
 * A chain is "supported" iff Cove has a chain code for it. There is no
 * configured allow-list and no default fallback: the Dexscreener lookup decides,
 * and if nothing supported is found the caller surfaces an error. A token lives
 * on a single chain, so resolution is deterministic — the highest-liquidity
 * Cove-supported chain wins; there is no picker.
 */

export type ChainResolution =
  | { kind: "ready"; chainId: string }
  | { kind: "none" };

/** A chain usable for an EVM token: not Solana, and with a Cove chain code. */
export function isSupportedEvmChain(chainId: string): boolean {
  return chainId !== "solana" && Boolean(coveChainCode(chainId));
}

export function resolveChains(
  extracted: ExtractedAddress,
  info: TokenInfo | null,
): ChainResolution {
  if (extracted.type === "solana") {
    return { kind: "ready", chainId: "solana" };
  }

  // EVM: the address alone can't distinguish chains, so use the Dexscreener
  // lookup and take the highest-liquidity Cove-supported chain.
  const topSupported = (info?.chains ?? [])
    .filter((c) => isSupportedEvmChain(c.chainId))
    .sort((a, b) => b.liquidityUsd - a.liquidityUsd)[0];

  return topSupported
    ? { kind: "ready", chainId: topSupported.chainId }
    : { kind: "none" };
}
