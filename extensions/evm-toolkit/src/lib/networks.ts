import type { ExplorerType } from "./explorer-types";

export interface Network {
  name: string;
  chainId: number;
  explorerUrl: string;
  explorerType: ExplorerType;
  explorerDomain: string;
}

export const NETWORKS: Network[] = [
  {
    name: "Mainnet",
    chainId: 1,
    explorerUrl: "https://etherscan.io",
    explorerType: "etherscan",
    explorerDomain: "etherscan",
  },
  {
    name: "Polygon",
    chainId: 137,
    explorerUrl: "https://polygonscan.com",
    explorerType: "etherscan",
    explorerDomain: "polygonscan",
  },
  {
    name: "Optimism",
    chainId: 10,
    explorerUrl: "https://optimistic.etherscan.io",
    explorerType: "etherscan",
    explorerDomain: "optimistic.etherscan",
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    explorerUrl: "https://arbiscan.io",
    explorerType: "etherscan",
    explorerDomain: "arbiscan",
  },
  {
    name: "Base",
    chainId: 8453,
    explorerUrl: "https://basescan.org",
    explorerType: "etherscan",
    explorerDomain: "basescan",
  },
  {
    name: "BSC",
    chainId: 56,
    explorerUrl: "https://bscscan.com",
    explorerType: "etherscan",
    explorerDomain: "bscscan",
  },
  {
    name: "Linea",
    chainId: 59144,
    explorerUrl: "https://lineascan.build",
    explorerType: "etherscan",
    explorerDomain: "lineascan",
  },
  {
    name: "Ink",
    chainId: 57073,
    explorerUrl: "https://explorer.inkonchain.com",
    explorerType: "blockscout",
    explorerDomain: "explorer.inkonchain",
  },
  {
    name: "Arbitrum Nova",
    chainId: 42170,
    explorerUrl: "https://nova.arbiscan.io",
    explorerType: "etherscan",
    explorerDomain: "nova.arbiscan",
  },
  {
    name: "zkSync",
    chainId: 324,
    explorerUrl: "https://explorer.zksync.io",
    explorerType: "zksync",
    explorerDomain: "explorer.zksync",
  },
  {
    name: "Avalanche",
    chainId: 43114,
    explorerUrl: "https://snowtrace.io",
    explorerType: "snowtrace",
    explorerDomain: "snowtrace",
  },
  {
    name: "Gnosis",
    chainId: 100,
    explorerUrl: "https://gnosisscan.io",
    explorerType: "etherscan",
    explorerDomain: "gnosisscan",
  },
  {
    name: "Scroll",
    chainId: 534352,
    explorerUrl: "https://scrollscan.com",
    explorerType: "etherscan",
    explorerDomain: "scrollscan",
  },
  {
    name: "Celo",
    chainId: 42220,
    explorerUrl: "https://celoscan.io",
    explorerType: "etherscan",
    explorerDomain: "celoscan",
  },
  {
    name: "Mantle",
    chainId: 5000,
    explorerUrl: "https://mantlescan.xyz",
    explorerType: "etherscan",
    explorerDomain: "mantlescan",
  },
  {
    name: "Blast",
    chainId: 81457,
    explorerUrl: "https://blastscan.io",
    explorerType: "etherscan",
    explorerDomain: "blastscan",
  },
  {
    name: "Sonic",
    chainId: 146,
    explorerUrl: "https://sonicscan.org",
    explorerType: "etherscan",
    explorerDomain: "sonicscan",
  },
  {
    name: "Unichain",
    chainId: 130,
    explorerUrl: "https://unichain.blockscout.com",
    explorerType: "blockscout",
    explorerDomain: "unichain.blockscout",
  },
  {
    name: "Flow",
    chainId: 747,
    explorerUrl: "https://evm.flowscan.io",
    explorerType: "blockscout",
    explorerDomain: "evm.flowscan",
  },
  {
    name: "World Chain",
    chainId: 480,
    explorerUrl: "https://worldscan.org",
    explorerType: "etherscan",
    explorerDomain: "worldscan",
  },
  {
    name: "ApeChain",
    chainId: 33139,
    explorerUrl: "https://apescan.io",
    explorerType: "etherscan",
    explorerDomain: "apescan",
  },
  {
    name: "Abstract",
    chainId: 2741,
    explorerUrl: "https://abscan.org",
    explorerType: "etherscan",
    explorerDomain: "abscan",
  },
  {
    name: "HyperEVM",
    chainId: 999,
    explorerUrl: "https://hyperscan.com",
    explorerType: "etherscan",
    explorerDomain: "hyperscan",
  },
  {
    name: "Mode",
    chainId: 34443,
    explorerUrl: "https://explorer.mode.network",
    explorerType: "blockscout",
    explorerDomain: "explorer.mode",
  },
];
