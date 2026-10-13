// Types shared by the Codex client, the search UI, and onboarding.

/** A Codex network, enriched with the Defined.fi URL slug and a block explorer. */
export interface Network {
  /** Codex network id, e.g. 1 (Ethereum), 8453 (Base), 1399811149 (Solana). */
  id: number;
  /** Display name, e.g. "Ethereum". */
  name: string;
  /** URL segment Defined.fi uses for this network, e.g. "eth", "sol", "base". */
  slug: string;
  /** Token page template on a block explorer; "{address}" is replaced. Undefined if unknown. */
  explorerTokenUrl?: string;
}

/** One search result: a token on one network. */
export interface TokenResult {
  /** Stable key: `${address}:${networkId}`. */
  id: string;
  address: string;
  networkId: number;
  networkName: string;
  networkSlug: string;
  name: string;
  symbol: string;
  imageUrl?: string;
  priceUsd?: number;
  /** 24h price change as a fraction: 0.04 means +4 %. */
  change24?: number;
  liquidityUsd?: number;
  volume24Usd?: number;
  marketCapUsd?: number;
  /** https://www.defined.fi/token/{networkSlug}/{address} (verified in a browser) */
  definedUrl: string;
  explorerUrl?: string;
}

export interface SearchOptions {
  /** Restrict to one Codex network id. Undefined means all networks. */
  networkId?: number;
  /** Default 25. */
  limit?: number;
  signal?: AbortSignal;
}

export type CodexErrorKind =
  | "invalid-key" // NOT_AUTHORIZED / 401: key missing, wrong, or revoked
  | "quota" // monthly request allowance used up
  | "rate-limit" // per-second limit; client already retried
  | "network" // fetch failed, offline, timeout
  | "unknown";

export class CodexError extends Error {
  constructor(
    public readonly kind: CodexErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "CodexError";
  }
}
