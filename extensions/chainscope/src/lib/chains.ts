import { defineChain, type Chain } from "viem";
import * as viemChains from "viem/chains";
import { arbitrum, base, bsc, mainnet, optimism, polygon, sepolia } from "viem/chains";

export type ChainConfig = {
  id: number;
  name: string;
  chain: Chain;
  defaultRpc: string;
  explorer: string; // base URL, no trailing slash
  blockscout?: string; // API base URL, no trailing slash
};

// More reliable public RPCs for the common chains than viem's bundled defaults.
const RELIABLE_RPC: Record<number, string> = {
  1: "https://ethereum-rpc.publicnode.com",
  10: "https://optimism-rpc.publicnode.com",
  56: "https://bsc-rpc.publicnode.com",
  137: "https://polygon-bor-rpc.publicnode.com",
  8453: "https://base-rpc.publicnode.com",
  42161: "https://arbitrum-one-rpc.publicnode.com",
  11155111: "https://ethereum-sepolia-rpc.publicnode.com",
};

// Hosted Blockscout instances that answered API requests when tested; others block scripted clients.
const BLOCKSCOUT: Record<number, string> = {
  1: "https://eth.blockscout.com",
  10: "https://optimism.blockscout.com",
  11155111: "https://eth-sepolia.blockscout.com",
};

const BY_ID = new Map<number, Chain>();
for (const c of Object.values(viemChains)) {
  if (c && typeof (c as Chain).id === "number") BY_ID.set((c as Chain).id, c as Chain);
}

function toConfig(chain: Chain): ChainConfig {
  return {
    id: chain.id,
    name: chain.name,
    chain,
    defaultRpc: RELIABLE_RPC[chain.id] ?? chain.rpcUrls.default.http[0] ?? "",
    explorer: (chain.blockExplorers?.default?.url ?? "").replace(/\/$/, ""),
    blockscout: BLOCKSCOUT[chain.id],
  };
}

function minimalChain(id: number, name?: string, symbol?: string): Chain {
  return defineChain({
    id,
    name: name ?? `Chain ${id}`,
    nativeCurrency: { name: symbol ?? "Ether", symbol: symbol ?? "ETH", decimals: 18 },
    rpcUrls: { default: { http: [] } },
  });
}

export type CustomChainInput = {
  id: number;
  name?: string;
  rpc?: string;
  explorer?: string;
  symbol?: string;
  blockscout?: string;
};
const CUSTOM = new Map<number, ChainConfig>();

export function registerCustomChains(entries: CustomChainInput[]): void {
  CUSTOM.clear();
  for (const e of entries) {
    if (!e || !Number.isInteger(e.id)) continue;
    const known = BY_ID.get(e.id);
    const chain = known
      ? e.symbol
        ? { ...known, nativeCurrency: { ...known.nativeCurrency, symbol: e.symbol } }
        : known
      : minimalChain(e.id, e.name, e.symbol);
    const base = toConfig(chain);
    CUSTOM.set(e.id, {
      id: e.id,
      name: e.name ?? base.name,
      chain,
      defaultRpc: e.rpc?.trim() || base.defaultRpc,
      explorer: (e.explorer ?? base.explorer).replace(/\/$/, ""),
      blockscout: e.blockscout?.trim().replace(/\/$/, "") || base.blockscout,
    });
  }
}

export function getChain(chainId: number): ChainConfig {
  return CUSTOM.get(chainId) ?? toConfig(BY_ID.get(chainId) ?? minimalChain(chainId));
}

export function builtInChain(chainId: number): ChainConfig | undefined {
  const chain = BY_ID.get(chainId);
  return chain && toConfig(chain);
}

export function listChains(): (ChainConfig & { custom: boolean })[] {
  const map = new Map<number, ChainConfig & { custom: boolean }>();
  for (const c of BY_ID.values()) map.set(c.id, { ...toConfig(c), custom: false });
  for (const [id, c] of CUSTOM) map.set(id, { ...c, custom: true });
  return [...map.values()].sort((a, b) => a.id - b.id);
}

export function lookupChains(): ChainConfig[] {
  return [...Object.values(CHAINS).filter((c) => !CUSTOM.has(c.id)), ...CUSTOM.values()];
}

export const CHAINS: Record<number, ChainConfig> = Object.fromEntries(
  [mainnet, optimism, bsc, polygon, base, arbitrum, sepolia].map((c) => [c.id, toConfig(c)]),
);
