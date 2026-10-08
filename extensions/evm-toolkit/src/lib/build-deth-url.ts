import type { Network } from "./networks";

const DETH_SUPPORTED_DOMAINS = new Set([
  "etherscan",
  "bscscan",
  "optimistic.etherscan",
  "polygonscan",
  "arbiscan",
  "snowtrace",
  "basescan",
  "gnosisscan",
  "blastscan",
  "sonicscan",
]);

export function isDethSupported(network: Network): boolean {
  return DETH_SUPPORTED_DOMAINS.has(network.explorerDomain);
}

export function buildDethUrl(network: Network, address: string): string {
  return `https://${network.explorerDomain}.deth.net/address/${address}`;
}
