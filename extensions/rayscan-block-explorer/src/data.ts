import { ChainData } from "./types"

export const chainData: ChainData[] = [
  {
    chainId: 1,
    name: "Ethereum",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      icon: "tokens/ethereum.svg",
      decimals: 18
    },
    blockExplorerName: "EtherScan",
    blockExplorerUrl: "https://etherscan.io/",
    icon: "explorers/etherscan.svg",
    rpcUrls: ["https://mainnet.infura.io/v3/"],
    keywords: ["eth", "ethereum", "mainnet"],
    priority: 1
  },
  {
    chainId: 56,
    name: "Binance Smart Chain",
    nativeCurrency: {
      name: "Binance Coin",
      symbol: "BNB",
      icon: "tokens/bnb.svg",
      decimals: 18
    },
    blockExplorerName: "BscScan",
    blockExplorerUrl: "https://bscscan.com/",
    icon: "explorers/bscscan.svg",
    rpcUrls: ["https://bsc-dataseed.binance.org/"],
    keywords: ["bsc", "binance smart chain"],
    priority: 1
  },
  {
    chainId: 137,
    name: "Polygon POS",
    nativeCurrency: {
      name: "Matic",
      symbol: "MATIC",
      icon: "tokens/matic.svg",
      decimals: 18
    },
    blockExplorerName: "PolygonScan",
    blockExplorerUrl: "https://polygonscan.com/",
    icon: "explorers/polygonscan6.svg",
    rpcUrls: ["https://rpc-mainnet.matic.network"],
    keywords: ["polygon", "matic", "pos", "polygon pos"],
    priority: 1
  },
  {
    chainId: 250,
    name: "Fantom",
    nativeCurrency: {
      name: "Fantom",
      symbol: "FTM",
      icon: "tokens/fantom.svg",
      decimals: 18
    },
    blockExplorerName: "FtmScan",
    blockExplorerUrl: "https://ftmscan.com/",
    icon: "explorers/ftmscan.svg",
    rpcUrls: ["https://rpcapi.fantom.network"],
    keywords: ["fantom", "ftm"],
    priority: 1
  },
  {
    chainId: 43114,
    name: "Avalanche",
    nativeCurrency: {
      name: "Avalanche",
      symbol: "AVAX",
      icon: "tokens/avax.svg",
      decimals: 18
    },
    blockExplorerName: "SnowTrace",
    blockExplorerUrl: "https://snowtrace.io/",
    icon: "explorers/snowtrace.svg",
    rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
    keywords: ["avalanche", "avax"],
    priority: 1
  },
  {
    chainId: 42161,
    name: "Arbitrum",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      icon: "tokens/ethereum.svg",
      decimals: 18
    },
    blockExplorerName: "ArbiScan",
    blockExplorerUrl: "https://arbiscan.io/",
    icon: "explorers/arbiscan.svg",
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    keywords: ["arbitrum", "arb"],
    priority: 1
  },
  {
    chainId: 324,
    name: "ZKSync Era",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      icon: "tokens/ethereum.svg",
      decimals: 18
    },
    blockExplorerName: "ZKScan",
    blockExplorerUrl: "https://explorer.zksync.io/",
    icon: "explorers/zkscan.svg",
    rpcUrls: ["https://rinkeby.zkscan.io/"],
    keywords: ["zksync", "zksync era", "zk", "era"],
    priority: 1
  },
  {
    chainId: 1101,
    name: "Polygon ZKEVM",
    nativeCurrency: {
      name: "Matic",
      symbol: "MATIC",
      icon: "tokens/matic.svg",
      decimals: 18
    },
    blockExplorerName: "PolygonScan",
    blockExplorerUrl: "https://zkevm.polygonscan.com/",
    icon: "explorers/polygonscan.svg",
    rpcUrls: ["https://rpc-mainnet.maticvigil.com/"],
    keywords: ["polygon zkevm", "matic zkevm", "zkevm", "polygon"],
    priority: 1
  }
]