import { withCache } from "@raycast/utils";
import { formatEther } from "viem";

// Public RPC endpoints to try in order (no API key required)
const LLAMA_RPC_ENDPOINT = "https://eth.llamarpc.com";
const PUBLICNODE_RPC_ENDPOINT = "https://ethereum-rpc.publicnode.com";

const RPC_ENDPOINTS = [PUBLICNODE_RPC_ENDPOINT, LLAMA_RPC_ENDPOINT];

// CoinGecko API endpoint for ETH price (no API key required for simple price endpoint)
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";

interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params: unknown[];
  id: number;
}

interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: string;
  error?: {
    code: number;
    message: string;
  };
}

interface CoinGeckoResponse {
  ethereum: {
    usd: number;
  };
}

export interface EthAddressBalance {
  eth: {
    balance: number;
    dollarValue: number;
  };
  ethPrice: number;
  address: string;
  rpcEndpoint: string;
}

/**
 * Cached function to fetch ETH price from CoinGecko
 * Cache expires after 1 minute
 */
export const getEthPrice = withCache(
  async () => {
    const response = await fetch(COINGECKO_API);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as CoinGeckoResponse;

    if (!data.ethereum?.usd) {
      throw new Error("Invalid price data from CoinGecko");
    }

    return data.ethereum.usd;
  },
  { maxAge: 1 * 60 * 1000 }, // Cache for 1 minute
);

/**
 * Fetches the ETH balance for a given address using public RPC endpoints
 * @param address - Ethereum wallet address
 * @returns Balance in ETH as a number
 */
export async function getEthBalance(address: string): Promise<EthAddressBalance> {
  const request: JsonRpcRequest = {
    jsonrpc: "2.0",
    method: "eth_getBalance",
    params: [address, "latest"],
    id: 1,
  };

  let lastError: Error | null = null;

  // Try each RPC endpoint until one works
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as JsonRpcResponse;

      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message} (code: ${data.error.code})`);
      }

      if (!data.result) {
        throw new Error("No result returned from RPC");
      }

      // Use viem's formatEther for safe BigInt arithmetic
      const balanceInEth = Number(formatEther(BigInt(data.result)));

      // Fetch current ETH price to calculate dollar value
      const ethPrice = await getEthPrice();
      const dollarValue = balanceInEth * ethPrice;

      return {
        eth: {
          balance: balanceInEth,
          dollarValue,
        },
        ethPrice,
        address,
        rpcEndpoint: endpoint,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  // If all endpoints failed, throw the last error
  throw lastError || new Error("All RPC endpoints failed");
}

/**
 * Formats ETH balance for display
 * @param balance - Balance in ETH
 * @returns Formatted balance string
 */
export function formatEthBalance(balance: number): string {
  if (balance === 0) return "0 ETH";
  if (balance < 0.0001) return "< 0.0001 ETH";
  if (balance < 1) return `${balance.toFixed(4)} ETH`;
  if (balance < 1000) return `${balance.toFixed(3)} ETH`;
  return `${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} ETH`;
}

/**
 * Formats dollar value for display
 * @param value - Dollar value
 * @returns Formatted dollar string
 */
export function formatDollarValue(value: number): string {
  if (value === 0) return "$0.00";
  if (value < 0.01) return "< $0.01";
  if (value < 1000) return `$${value.toFixed(2)}`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
