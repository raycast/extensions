import { Connection, PublicKey } from "@solana/web3.js";
import { ethers } from "ethers";

const SOLANA_RPCS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-api.projectserum.com",
  "https://rpc.ankr.com/solana",
  "https://solana.public-rpc.com",
];
const ETH_RPCS = [
  "https://mainnet.infura.io",
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
  if (!checkRateLimit("solana")) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

  // Parallel RPC calls with timeout
  const checkPromises = SOLANA_RPCS.slice(0, 3).map(async (rpc) => {
    try {
      const connection = new Connection(rpc);
      const pubkey = new PublicKey(address);

      const accountInfo = await Promise.race([
        connection.getAccountInfo(pubkey),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), RPC_TIMEOUT)),
      ]);

      if (!accountInfo) return false;
      return accountInfo.owner.equals(TOKEN_PROGRAM_ID) || accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
    } catch {
      return false;
    }
  });

  const results = await Promise.all(checkPromises);
  return results.some((result: boolean) => result === true);
}

// Cache for working RPC providers
const providerCache = new Map<string, { provider: ethers.JsonRpcProvider; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

// Standardized timeout for all RPC operations
const RPC_TIMEOUT = 10000; // 10 seconds

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(identifier);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (limit.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  limit.count++;
  return true;
}

async function tryProviders(rpcs: string[], useCache = true): Promise<ethers.JsonRpcProvider | null> {
  // Check cache first
  if (useCache) {
    for (const rpc of rpcs) {
      const cached = providerCache.get(rpc);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.provider;
      }
    }
  }

  // Try providers with exponential backoff
  let backoffMs = 100;
  for (const rpc of rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await Promise.race([
        provider.getNetwork(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), RPC_TIMEOUT)),
      ]);

      // Cache successful provider
      providerCache.set(rpc, { provider, timestamp: Date.now() });
      return provider;
    } catch {
      // Exponential backoff with max 1 second
      await new Promise((resolve) => setTimeout(resolve, Math.min(backoffMs, 1000)));
      backoffMs *= 2;
      continue;
    }
  }
  return null;
}

export async function checkEVMToken(address: string): Promise<{ chain: ChainType | null; isToken: boolean }> {
  if (!checkRateLimit("evm")) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

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
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), RPC_TIMEOUT)),
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
  if (!checkRateLimit("evm-nonce")) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

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
  if (!isTransactionHash(hash)) {
    return "unknown";
  }

  // Fast parallel check across all chains with early termination
  const checkPromises: Promise<ChainType | null>[] = [];

  // Solana check - use format-based detection since RPC calls timeout in Raycast
  if (!hash.startsWith("0x") && hash.length >= 80 && hash.length <= 90) {
    // Basic base58 validation for Solana transaction signatures
    if (/^[1-9A-HJ-NP-Za-km-z]+$/.test(hash)) {
      checkPromises.push(Promise.resolve("solana"));
    } else {
      checkPromises.push(Promise.resolve(null));
    }
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
                new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), RPC_TIMEOUT)),
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

    return found || "unknown";
  } catch {
    return "unknown";
  }
}
