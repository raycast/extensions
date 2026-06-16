import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  network: "mainnet" | "testnet";
}

// Hyperliquid's public info API is a single unauthenticated JSON POST endpoint.
// This extension only reads two request types, so a small fetch wrapper replaces
// the full trading SDK (and its msgpack/secp256k1/valibot dependencies).
const BASE_URL = {
  mainnet: "https://api.hyperliquid.xyz",
  testnet: "https://api.hyperliquid-testnet.xyz",
} as const;

const REQUEST_TIMEOUT_MS = 10_000;

// Minimal response shapes — only the fields this extension consumes. Numeric
// values arrive as strings and are coerced at the call site.
export interface PerpDexMeta {
  name: string;
  fullName?: string;
  full_name?: string;
}

export interface PerpAsset {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated?: boolean;
  isDelisted?: boolean;
}

export interface PerpMeta {
  universe: PerpAsset[];
}

export interface PerpAssetCtx {
  markPx: string;
  midPx?: string | null;
  oraclePx: string;
  prevDayPx: string;
  dayNtlVlm: string;
  openInterest: string;
  funding: string;
}

export type MetaAndAssetCtxs = [PerpMeta, PerpAssetCtx[]];

async function info<T>(body: object): Promise<T> {
  const { network } = getPreferenceValues<Preferences>();
  const baseUrl = network === "testnet" ? BASE_URL.testnet : BASE_URL.mainnet;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Hyperliquid API responded with ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

// All perp DEXs. The first element is `null` and represents the main Hyperliquid
// perp DEX; the rest are builder-deployed DEXs.
export function getPerpDexs(): Promise<(PerpDexMeta | null)[]> {
  return info<(PerpDexMeta | null)[]>({ type: "perpDexs" });
}

// Metadata and asset contexts for a DEX. Omit `dex` (or pass "") for the main DEX.
export function getMetaAndAssetCtxs(dex?: string): Promise<MetaAndAssetCtxs> {
  return info<MetaAndAssetCtxs>(dex ? { type: "metaAndAssetCtxs", dex } : { type: "metaAndAssetCtxs" });
}
