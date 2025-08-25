import { Connection, PublicKey } from "@solana/web3.js";
import { ethers } from "ethers";

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const ETH_RPCS = [
  "https://1rpc.io/eth",
  "https://rpc.mevblocker.io/fast",
  "https://rpc.mevblocker.io/noreverts",
  "https://rpc.mevblocker.io/fullprivacy",
  "https://ethereum-rpc.publicnode.com",
];
const BSC_RPCS = [
  "https://api.zan.top/bsc-mainnet",
  "https://1rpc.io/bnb",
  "https://rpc-bsc.48.club",
  "https://bsc.therpc.io",
  "https://bsc.drpc.org",
];
const BASE_RPCS = [
  "https://1rpc.io/base",
  "https://api.zan.top/base-mainnet",
  "https://mainnet.base.org",
  "https://base.llamarpc.com",
];

export type ChainType = "solana" | "ethereum" | "bsc" | "base" | "unknown";
export type AddressType = "token" | "wallet" | "unknown";

export interface ChainInfo {
  chain: ChainType;
  addressType: AddressType;
  isTransaction: boolean;
}

export function isSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return address.length >= 32 && address.length <= 44;
  } catch {
    return false;
  }
}

export function isEVMAddress(address: string): boolean {
  return ethers.isAddress(address);
}

export function isTransactionHash(hash: string): boolean {
  return hash.length === 64 || hash.length === 66;
}

export async function checkSolanaToken(address: string): Promise<boolean> {
  try {
    const connection = new Connection(SOLANA_RPC);
    const pubkey = new PublicKey(address);

    const accountInfo = await connection.getAccountInfo(pubkey);
    if (!accountInfo) return false;

    const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

    return accountInfo.owner.equals(TOKEN_PROGRAM_ID) || accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
  } catch {
    return false;
  }
}

async function tryProviders(rpcs: string[]): Promise<ethers.JsonRpcProvider | null> {
  const providerPromises = rpcs.map(async (rpc) => {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await Promise.race([
        provider.getNetwork(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
      ]);
      return provider;
    } catch {
      return null;
    }
  });

  const results = await Promise.all(providerPromises);
  return results.find((provider) => provider !== null) || null;
}

export async function checkEVMToken(address: string): Promise<{ chain: ChainType | null; isToken: boolean }> {
  const chains: { chain: ChainType; rpcs: string[] }[] = [
    { chain: "ethereum", rpcs: ETH_RPCS },
    { chain: "bsc", rpcs: BSC_RPCS },
    { chain: "base", rpcs: BASE_RPCS },
  ];

  const ERC20_ABI = [
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
  ];

  const checkPromises = chains.map(async ({ chain, rpcs }) => {
    const provider = await tryProviders(rpcs);
    if (!provider) return null;

    try {
      const code = await provider.getCode(address);
      if (code !== "0x") {
        const contract = new ethers.Contract(address, ERC20_ABI, provider);
        try {
          await Promise.race([
            contract.totalSupply(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
          ]);
          return { chain, isToken: true };
        } catch {
          return null;
        }
      }
    } catch {
      return null;
    }
    return null;
  });

  const results = await Promise.all(checkPromises);
  const found = results.find((result) => result && result.isToken);

  return found || { chain: null, isToken: false };
}

export async function checkEVMNonce(address: string): Promise<ChainType | null> {
  const chains: { chain: ChainType; rpcs: string[] }[] = [
    { chain: "ethereum", rpcs: ETH_RPCS },
    { chain: "bsc", rpcs: BSC_RPCS },
    { chain: "base", rpcs: BASE_RPCS },
  ];

  const checkPromises = chains.map(async ({ chain, rpcs }) => {
    const provider = await tryProviders(rpcs);
    if (!provider) return null;

    try {
      const nonce = await provider.getTransactionCount(address);
      if (nonce > 0) {
        return chain;
      }
    } catch {
      return null;
    }
    return null;
  });

  const results = await Promise.all(checkPromises);
  return results.find((chain) => chain !== null) || null;
}

export function detectTransactionChain(hash: string): ChainType {
  if (hash.length === 64 && !hash.startsWith("0x")) {
    return "solana";
  } else if (hash.length === 66 && hash.startsWith("0x")) {
    return "ethereum";
  }
  return "unknown";
}
