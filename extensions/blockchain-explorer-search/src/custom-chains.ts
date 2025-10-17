import { Chain } from "viem";

export const coqnet: Chain = {
  id: 42069,
  name: "coqnet",
  nativeCurrency: { decimals: 18, name: "COQ", symbol: "COQ" },
  rpcUrls: { default: { http: ["https://subnets.avax.network/coqnet/mainnet/rpc"] } },
  blockExplorers: {
    default: { name: "Coqnet Explorer", url: "https://coqscan.com" },
  },
  testnet: false,
};

// Solana Mainnet (using a pseudo chain ID since Solana isn't EVM)
export const solana: Chain = {
  id: 1399811149, // Using Solana's network magic
  name: "Solana",
  nativeCurrency: { decimals: 9, name: "SOL", symbol: "SOL" },
  rpcUrls: { default: { http: ["https://api.mainnet-beta.solana.com"] } },
  blockExplorers: {
    default: { name: "Solscan", url: "https://solscan.io" },
  },
  testnet: false,
};

// Solana Devnet
export const solanaDevnet: Chain = {
  id: 1399811150,
  name: "Solana Devnet",
  nativeCurrency: { decimals: 9, name: "SOL", symbol: "SOL" },
  rpcUrls: { default: { http: ["https://api.devnet.solana.com"] } },
  blockExplorers: {
    default: { name: "Solscan Devnet", url: "https://solscan.io" },
  },
  testnet: true,
};

// Bitcoin Mainnet (pseudo chain since Bitcoin isn't EVM)
export const bitcoin: Chain = {
  id: 8332, // Bitcoin RPC port
  name: "Bitcoin",
  nativeCurrency: { decimals: 8, name: "Bitcoin", symbol: "BTC" },
  rpcUrls: { default: { http: ["https://blockstream.info/api"] } },
  blockExplorers: {
    default: { name: "Blockchain.com", url: "https://blockchain.com" },
  },
  testnet: false,
};

export const customChains: Chain[] = [coqnet, solana, solanaDevnet, bitcoin];
