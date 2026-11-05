import { getAddress } from "viem";
import { getChain } from "./chains";

export type Token = {
  chain: string;
  chainId?: number; // EVM only
  symbol: string;
  name: string;
  address: string; // EVM address or Solana mint
  decimals: number;
  logoURI?: string;
  verified: boolean;
  priceUsd?: number;
  audit?: string; // Solana: mint/freeze authority status
};

const UNISWAP_LIST = "https://tokens.uniswap.org";
const JUPITER_SEARCH = "https://datapi.jup.ag/v1/assets/search";

type UniToken = { chainId: number; address: string; name: string; symbol: string; decimals: number; logoURI?: string };
type JupAsset = {
  id: string;
  name: string;
  symbol: string;
  icon?: string;
  decimals: number;
  isVerified?: boolean;
  usdPrice?: number;
  audit?: { mintAuthorityDisabled?: boolean; freezeAuthorityDisabled?: boolean };
};

function auditSummary(a?: JupAsset["audit"]): string | undefined {
  if (!a) return undefined;
  return `mint authority ${a.mintAuthorityDisabled ? "revoked ✓" : "active ⚠"} · freeze ${a.freezeAuthorityDisabled ? "revoked ✓" : "active ⚠"}`;
}

export async function fetchEvmTokens(url = UNISWAP_LIST): Promise<Token[]> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Token list returned ${res.status}`);
  const json = (await res.json()) as { tokens: UniToken[] };
  return json.tokens.map((t) => ({
    chain: getChain(t.chainId).name,
    chainId: t.chainId,
    symbol: t.symbol,
    name: t.name,
    address: safeChecksum(t.address),
    decimals: t.decimals,
    logoURI: t.logoURI,
    verified: true,
  }));
}

function safeChecksum(addr: string): string {
  try {
    return getAddress(addr.toLowerCase()); // re-checksum (the list ships non-canonical casing)
  } catch {
    return addr;
  }
}

export async function searchSolanaTokens(query: string, url = JUPITER_SEARCH): Promise<Token[]> {
  if (query.trim().length < 1) return [];
  const res = await fetch(`${url}?query=${encodeURIComponent(query.trim())}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Token search returned ${res.status}`);
  const arr = (await res.json()) as JupAsset[];
  return arr.map((a) => ({
    chain: "Solana",
    symbol: a.symbol,
    name: a.name,
    address: a.id,
    decimals: a.decimals,
    logoURI: a.icon,
    verified: !!a.isVerified,
    priceUsd: a.usdPrice,
    audit: auditSummary(a.audit),
  }));
}

export function filterEvmTokens(tokens: Token[], query: string, chainId?: number): Token[] {
  const q = query.trim().toLowerCase();
  const scoped = chainId ? tokens.filter((t) => t.chainId === chainId) : tokens;
  if (!q) return scoped.slice(0, 100);
  const matches = scoped.filter(
    (t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.address.toLowerCase() === q,
  );
  matches.sort((a, b) => Number(b.symbol.toLowerCase() === q) - Number(a.symbol.toLowerCase() === q));
  return matches.slice(0, 100);
}
