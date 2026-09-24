// Codex network -> Defined.fi URL slug, and Codex network -> block explorer URL.
//
// Defined.fi token URLs: https://www.defined.fi/token/{slug}/{address}
// (the bare https://www.defined.fi/{slug}/{address} form redirects to the
// /token/ form; we build the canonical /token/ form directly).
//
// defined.fi blocks scripted fetches (403/429), so this table cannot be
// verified by scraping. It is checked by hand in a real browser instead.

import type { Network } from "./types";

/**
 * Defined.fi slugs checked against real https://www.defined.fi pages in a
 * browser on 2026-09-23. Where Codex's live `networkShortName` was also
 * checked (eth, sol, base, bsc, arb, opti), it matched; the table pins these
 * slugs in case Codex renames a short name. Other networks fall back to
 * `networkShortName.toLowerCase()` (see `deriveDefinedSlug`), which is
 * unverified.
 */
export const DEFINED_SLUG_OVERRIDES: Record<number, string> = {
  1: "eth", // Ethereum — VERIFIED
  1399811149: "sol", // Solana — VERIFIED
  8453: "base", // Base — VERIFIED
  56: "bsc", // BNB Chain — VERIFIED
  42161: "arb", // Arbitrum — VERIFIED
  10: "opti", // Optimism — VERIFIED (not "op")
  143: "mon", // Monad — VERIFIED
  4663: "robinhood", // Robinhood Chain — VERIFIED
};

/**
 * Block explorer token-page URL templates, keyed by Codex network id.
 * "{address}" is replaced with the token's contract address (or, for
 * Solana, the mint address; Solscan uses the same /token/ path for mints).
 *
 * Network ids are taken from Codex's supported-networks documentation
 * (https://docs.codex.io/networks.md), which for EVM chains equals the
 * chain's native EVM chain id. These URL templates are well-known public
 * explorer conventions, not independently verified against defined.fi.
 * Unknown networks resolve to undefined rather than a guessed URL.
 */
export const EXPLORER_TOKEN_URL_TEMPLATES: Record<number, string> = {
  1: "https://etherscan.io/token/{address}", // Ethereum
  8453: "https://basescan.org/token/{address}", // Base
  56: "https://bscscan.com/token/{address}", // BNB Chain
  42161: "https://arbiscan.io/token/{address}", // Arbitrum
  137: "https://polygonscan.com/token/{address}", // Polygon
  10: "https://optimistic.etherscan.io/token/{address}", // Optimism
  43114: "https://snowtrace.io/token/{address}", // Avalanche
  1399811149: "https://solscan.io/token/{address}", // Solana
  101: "https://suiscan.xyz/mainnet/coin/{address}", // Sui (Codex network id; not the chain's native id)
  728126428: "https://tronscan.org/#/token20/{address}", // Tron
  81457: "https://blastscan.io/token/{address}", // Blast
  59144: "https://lineascan.build/token/{address}", // Linea
  534352: "https://scrollscan.com/token/{address}", // Scroll
  324: "https://explorer.zksync.io/address/{address}", // zkSync Era
  5000: "https://mantlescan.xyz/token/{address}", // Mantle
  146: "https://sonicscan.org/token/{address}", // Sonic
  80094: "https://berascan.com/token/{address}", // Berachain
  130: "https://uniscan.xyz/token/{address}", // Unichain
  999: "https://hyperevmscan.io/token/{address}", // HyperEVM
};

/**
 * Derive the Defined.fi slug for a network: the override table for known
 * mismatches, else the Codex `networkShortName` lowercased, else a
 * best-effort fallback derived from the network name so callers always get
 * a usable (if unverified) slug.
 */
export function deriveDefinedSlug(
  networkId: number,
  networkShortName: string | null | undefined,
  networkName: string,
): string {
  const override = DEFINED_SLUG_OVERRIDES[networkId];
  if (override) return override;

  const shortName = networkShortName?.trim();
  if (shortName) return shortName.toLowerCase();

  const fromName = networkName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return fromName || String(networkId);
}

/** Block explorer token-page URL for a network, or undefined if unknown. */
export function explorerUrlFor(networkId: number, address: string): string | undefined {
  const template = EXPLORER_TOKEN_URL_TEMPLATES[networkId];
  if (!template) return undefined;
  return template.replace("{address}", address);
}

/** Defined.fi token page URL for a resolved slug + address. */
export function definedUrlFor(slug: string, address: string): string {
  return `https://www.defined.fi/token/${slug}/${address}`;
}

/**
 * One-stop helper used by codex.ts: resolve a network's Defined.fi slug and
 * explorer URL for a given token address.
 */
export function buildTokenUrls(params: {
  networkId: number;
  networkShortName?: string | null;
  networkName: string;
  address: string;
}): { slug: string; definedUrl: string; explorerUrl?: string } {
  const slug = deriveDefinedSlug(params.networkId, params.networkShortName, params.networkName);
  return {
    slug,
    definedUrl: definedUrlFor(slug, params.address),
    explorerUrl: explorerUrlFor(params.networkId, params.address),
  };
}

/** Build a full Network (id/name/slug/explorerTokenUrl) from raw Codex fields. */
export function toNetwork(id: number, name: string, networkShortName: string | null | undefined): Network {
  const slug = deriveDefinedSlug(id, networkShortName, name);
  return {
    id,
    name,
    slug,
    explorerTokenUrl: EXPLORER_TOKEN_URL_TEMPLATES[id],
  };
}
