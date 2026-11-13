import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { getChain, registerCustomChains } from "./chains";
import type { DecodeConfig } from "./evm";
import { changedFrom, fromPreferences, merge, solanaRpcFor, type Settings } from "./settings-model";

const KEY = "settings-changes";

export type { Settings };

let current = fromPreferences({});

function apply(next: Settings): void {
  current = next;
  registerCustomChains(next.chains);
}

// Call before reading settings; `withSettings` does this for each command.
export async function loadSettings(): Promise<Settings> {
  const raw = await LocalStorage.getItem<string>(KEY);
  let saved: Partial<Settings> = {};
  try {
    saved = raw ? JSON.parse(raw) : {};
  } catch {
    // unreadable changes fall back to the preferences page
  }
  apply(merge(fromPreferences(getPreferenceValues<Preferences>()), saved));
  return current;
}

export async function saveSettings(next: Settings): Promise<void> {
  const changes = changedFrom(fromPreferences(getPreferenceValues<Preferences>()), next);
  await LocalStorage.setItem(KEY, JSON.stringify(changes));
  apply(next);
}

export function getSettings(): Settings {
  return current;
}

export function getConfig(): DecodeConfig {
  const s = current;
  return {
    chainId: s.defaultChainId,
    etherscanApiKey: s.etherscanApiKey,
    sources: s.sources,
    sourcifyUrl: s.sourcifyUrl,
    signatureDbUrl: s.signatureDbUrl,
  };
}

// Custom chains may have no explorer.
export function explorerUrl(chainId: number, path: string): string | undefined {
  const { explorer } = getChain(chainId);
  return explorer ? `${explorer}/${path}` : undefined;
}

export function nativeSymbol(chainId: number): string {
  return getChain(chainId).chain.nativeCurrency.symbol;
}

export function chainName(chainId: number): string {
  return getChain(chainId).name;
}

export function getSolanaConfig(): { rpc: string; cluster: string } {
  return { rpc: solanaRpcFor(current.solanaCluster, current.solanaRpc), cluster: current.solanaCluster };
}

export function solscanUrl(cluster: string, path: string): string {
  const q = cluster && cluster !== "mainnet-beta" ? `?cluster=${cluster}` : "";
  return `https://solscan.io/${path}${q}`;
}
