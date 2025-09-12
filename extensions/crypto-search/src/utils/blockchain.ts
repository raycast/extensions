import { Connection, PublicKey } from "@solana/web3.js";
import { ethers } from "ethers";

const SOLANA_RPCS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-api.projectserum.com",
  "https://rpc.ankr.com/solana",
  "https://solana.public-rpc.com",
];
const ETH_RPCS = [
  "https://1rpc.io/eth",
  "https://rpc.mevblocker.io/fast",
  "https://rpc.mevblocker.io/noreverts",
  "https://rpc.mevblocker.io/fullprivacy",
  "https://ethereum-rpc.publicnode.com",
];
const BSC_RPCS = [
  "https://1rpc.io/bnb",
  "https://rpc-bsc.48.club",
  "https://bsc.therpc.io",
  "https://bsc.drpc.org",
  "https://api.zan.top/bsc-mainnet",
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
  // EVM transaction hash: 66 chars starting with 0x
  if (hash.length === 66 && hash.startsWith("0x")) return true;

  // Solana transaction signature: typically 87-88 chars, base58 encoded, no 0x prefix
  if (hash.length >= 80 && hash.length <= 90 && !hash.startsWith("0x")) {
    // Basic base58 character check (rough validation)
    return /^[1-9A-HJ-NP-Za-km-z]+$/.test(hash);
  }

  return false;
}

export async function checkSolanaToken(address: string): Promise<boolean> {
  for (const rpc of SOLANA_RPCS) {
    try {
      const connection = new Connection(rpc);
      const pubkey = new PublicKey(address);

      const accountInfo = await connection.getAccountInfo(pubkey);
      if (!accountInfo) continue;

      const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
      const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

      return accountInfo.owner.equals(TOKEN_PROGRAM_ID) || accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
    } catch {
      continue;
    }
  }
  return false;
}

async function tryProviders(rpcs: string[]): Promise<ethers.JsonRpcProvider | null> {
  for (const rpc of rpcs) {
    try {
      console.log(`Trying provider: ${rpc}`);
      const provider = new ethers.JsonRpcProvider(rpc);
      await Promise.race([
        provider.getNetwork(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
      ]);
      console.log(`Provider ${rpc} working!`);
      return provider;
    } catch (error) {
      console.log(`Provider ${rpc} failed: ${error}`);
      continue;
    }
  }
  return null;
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

export async function detectTransactionChain(hash: string): Promise<ChainType> {
  console.log(`Detecting transaction chain for hash: ${hash}`);

  if (!isTransactionHash(hash)) {
    console.log("Hash format invalid");
    return "unknown";
  }

  // Fast parallel check across all chains with early termination
  const checkPromises: Promise<ChainType | null>[] = [];

  // Solana check - use format-based detection since RPC calls timeout in Raycast
  if (!hash.startsWith("0x") && hash.length >= 80 && hash.length <= 90) {
    console.log(`Detected Solana transaction format: ${hash} (length: ${hash.length})`);
    // Basic base58 validation for Solana transaction signatures
    if (/^[1-9A-HJ-NP-Za-km-z]+$/.test(hash)) {
      console.log(`Solana result: DETECTED based on format`);
      checkPromises.push(Promise.resolve("solana"));
    } else {
      console.log(`Solana result: Invalid base58 format`);
      checkPromises.push(Promise.resolve(null));
    }
  } else {
    console.log(`Skipping Solana - hash format: length=${hash.length}, startsWith0x=${hash.startsWith("0x")}`);
  }

  // EVM chains check (parallel)
  if (hash.startsWith("0x") && hash.length === 66) {
    const evmChains = [
      { chain: "ethereum" as ChainType, rpcs: ETH_RPCS.slice(0, 2) }, // Use top 2 RPCs for speed
      { chain: "bsc" as ChainType, rpcs: BSC_RPCS.slice(0, 2) },
      { chain: "base" as ChainType, rpcs: BASE_RPCS.slice(0, 2) },
    ];

    evmChains.forEach(({ chain, rpcs }) => {
      checkPromises.push(
        (async () => {
          // Parallel RPC calls within each chain
          const rpcPromises = rpcs.map(async (rpc) => {
            try {
              const provider = new ethers.JsonRpcProvider(rpc);
              const tx = await Promise.race([
                provider.getTransaction(hash),
                new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
              ]);
              return tx ? chain : null;
            } catch {
              return null;
            }
          });

          const results = await Promise.all(rpcPromises);
          return results.find((result) => result !== null) || null;
        })()
      );
    });
  }

  // Wait for first successful result or all to complete
  try {
    const results = await Promise.allSettled(checkPromises);
    const found = results
      .filter((result) => result.status === "fulfilled" && result.value !== null)
      .map((result) => (result as PromiseFulfilledResult<ChainType>).value)[0];

    console.log(`Final result: ${found || "unknown"}`);
    return found || "unknown";
  } catch {
    return "unknown";
  }
}
