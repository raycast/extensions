import type { CustomChainInput } from "./chains";

export type Settings = {
  defaultChainId: number;
  chains: CustomChainInput[];
  solanaCluster: string;
  solanaRpc?: string;
  etherscanApiKey?: string;
  sources: { sourcify: boolean; blockscout: boolean; signatureDb: boolean };
  sourcifyUrl?: string;
  signatureDbUrl?: string;
  tokenListUrl?: string;
  jupiterUrl?: string;
};

export type RawPreferences = {
  etherscanApiKey?: string;
  defaultChain?: string;
  solanaCluster?: string;
  solanaRpc?: string;
  useSourcify?: boolean;
  useBlockscout?: boolean;
  useSignatureDb?: boolean;
  sourcifyUrl?: string;
  signatureDbUrl?: string;
  tokenListUrl?: string;
  jupiterUrl?: string;
};

export function chainError(
  v: { id: number; name?: string; rpc?: string; symbol?: string },
  saved: { id: number }[],
  builtIn: boolean,
  editingId?: number,
): string | undefined {
  if (!Number.isInteger(v.id) || v.id <= 0) return "Enter a whole number network ID";
  if (v.id !== editingId && saved.some((c) => c.id === v.id)) return `Network ${v.id} is already in your list`;
  if (builtIn) return undefined;
  if (!v.name?.trim()) return "This network isn't built in, so it needs a name";
  if (!v.rpc?.trim()) return "This network isn't built in, so it needs an RPC URL";
  if (!v.symbol?.trim()) return "This network isn't built in, so it needs a network token";
  return undefined;
}

function cleanUrl(value?: string): string | undefined {
  return value?.trim().replace(/\/$/, "") || undefined;
}

export function fromPreferences(p: RawPreferences): Settings {
  return {
    defaultChainId: Number(p.defaultChain || "1"),
    chains: [],
    solanaCluster: p.solanaCluster || "mainnet-beta",
    solanaRpc: cleanUrl(p.solanaRpc),
    etherscanApiKey: p.etherscanApiKey?.trim() || undefined,
    sources: {
      sourcify: p.useSourcify !== false,
      blockscout: p.useBlockscout !== false,
      signatureDb: p.useSignatureDb !== false,
    },
    sourcifyUrl: cleanUrl(p.sourcifyUrl),
    signatureDbUrl: cleanUrl(p.signatureDbUrl),
    tokenListUrl: cleanUrl(p.tokenListUrl),
    jupiterUrl: cleanUrl(p.jupiterUrl),
  };
}

// Only diffs, so later preference edits still apply.
export function changedFrom(base: Settings, next: Settings): Partial<Settings> {
  const changed: Record<string, unknown> = {};
  for (const key of Object.keys(next) as (keyof Settings)[]) {
    if (JSON.stringify(next[key]) !== JSON.stringify(base[key])) changed[key] = next[key];
  }
  return changed as Partial<Settings>;
}

// Manage Networks saves only these; preferences decide everything else.
export function merge(base: Settings, saved: Partial<Settings>): Settings {
  return {
    ...base,
    chains: saved.chains ?? base.chains,
    defaultChainId: saved.defaultChainId ?? base.defaultChainId,
  };
}

const SOLANA_RPC: Record<string, string> = {
  "mainnet-beta": "https://solana-rpc.publicnode.com",
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
};

export function solanaRpcFor(cluster: string, custom?: string): string {
  return custom || SOLANA_RPC[cluster] || SOLANA_RPC["mainnet-beta"];
}
