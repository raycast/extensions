import {
  Connection,
  PublicKey,
  AccountInfo,
  ParsedTransactionWithMeta,
  BlockResponse,
  VersionedBlockResponse,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getPreferenceValues } from "@raycast/api";
import { PublicKey as UmiPublicKey } from "@metaplex-foundation/umi";
import { fetchDigitalAsset } from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { getDomainKeySync, NameRegistryState } from "@bonfida/spl-name-service";

interface Preferences {
  defaultExplorer: "Solana Explorer" | "Solscan" | "SolanaFM" | "Orb";
  mainnetRpcUrl: string;
  devnetRpcUrl: string;
  testnetRpcUrl: string;
}

const preferences = getPreferenceValues<Preferences>();

export type Network = "mainnet" | "devnet" | "testnet";

export type SearchType = "address" | "transaction" | "block" | "token" | "NFT" | "domain";

interface AddressData extends AccountInfo<Buffer> {
  address: string;
}

interface TokenData extends AccountInfo<Buffer> {
  address: string;
  mint: string;
  metadata: TokenMetadata | null;
}

interface NFTData {
  address: string;
  metadata: {
    name: string;
    symbol: string;
    description: string;
    image: string;
    sellerFeeBasisPoints: number;
    isMutable: boolean;
    primarySaleHappened: boolean;
    updateAuthorityAddress: string;
  } | null;
}

type ResultData =
  | AddressData
  | ParsedTransactionWithMeta
  | BlockResponse
  | VersionedBlockResponse
  | TokenData
  | NFTData;

export interface SearchResult {
  type: SearchType;
  data: ResultData;
  network: Network;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  description?: string;
  logoURI?: string;
  marketCap?: string;
  liquidity?: string;
  totalSupply?: string;
}

export interface NFTMetadataURI {
  description: string;
  image: string;
}

// RPC URLs for different networks
export const RPC_URLS = {
  mainnet: preferences.mainnetRpcUrl,
  devnet: preferences.devnetRpcUrl,
  testnet: preferences.testnetRpcUrl,
};

// Explorer URLs for different networks
export const EXPLORER_BASE_URLS = {
  "Solana Explorer": "https://explorer.solana.com",
  Solscan: "https://solscan.io",
  SolanaFM: "https://solana.fm",
  Orb: "https://orb.helius.dev",
};

export const EXPLORER_CLUSTER_URLS = {
  "Solana Explorer": {
    mainnet: "",
    devnet: "?cluster=devnet",
    testnet: "?cluster=testnet",
  },
  Solscan: {
    mainnet: "",
    devnet: "?cluster=devnet",
    testnet: "?cluster=testnet",
  },
  SolanaFM: {
    mainnet: "?cluster=mainnet-alpha",
    devnet: "?cluster=devnet-solana",
    testnet: "?cluster=testnet-solana",
  },
  Orb: {
    mainnet: "",
    devnet: "?cluster=devnet",
    testnet: "?cluster=testnet",
  },
};

// Create a function to get connection for a specific network
export function getConnection(network: Network): Connection {
  return new Connection(RPC_URLS[network]);
}

async function isTokenAccount(address: string, network: Network): Promise<boolean> {
  try {
    const connection = getConnection(network);
    const accountInfo = await connection.getAccountInfo(new PublicKey(address));
    if (!accountInfo) return false;

    // Check if the account is owned by the Token Program
    return accountInfo.owner?.equals(TOKEN_PROGRAM_ID) ?? false;
  } catch {
    return false;
  }
}

async function getTokenMetadata(tokenAddress: string): Promise<TokenMetadata | null> {
  try {
    const response = await fetch(`https://api.phantom.app/tokens/v1/solana:101/address/${tokenAddress}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const parsedResponse = (await response.json()) as { data: TokenMetadata };
    const data = parsedResponse.data;

    // Validate and transform the response data
    return {
      name: data.name || "Unknown Token",
      symbol: data.symbol || "UNKNOWN",
      decimals: Number(data.decimals) || 0,
      logoURI: data.logoURI,
      description: data.description,
      marketCap: data.marketCap,
      liquidity: data.liquidity,
      totalSupply: data.totalSupply,
    };
  } catch (error) {
    console.error("Error fetching token metadata:", error);
    return null;
  }
}

async function getNFTMetadata(nftAddress: string, network: Network) {
  try {
    const connection = getConnection(network);
    const mintPublicKey = nftAddress as UmiPublicKey;

    const umi = createUmi(connection.rpcEndpoint);
    const nft = (await fetchDigitalAsset(umi, mintPublicKey)).metadata;

    const metadataURI: NFTMetadataURI = JSON.parse(await (await fetch(nft.uri)).text());

    const finalMetadata = {
      name: nft.name,
      symbol: nft.symbol,
      description: metadataURI.description,
      image: metadataURI.image,
      sellerFeeBasisPoints: nft.sellerFeeBasisPoints,
      isMutable: nft.isMutable,
      primarySaleHappened: nft.primarySaleHappened,
      updateAuthorityAddress: nft.updateAuthority.toString(),
    };

    return finalMetadata;
  } catch (error) {
    console.error("Error fetching NFT metadata:", error);
    return null;
  }
}

/**
 * Detects the type of search query based on its format and content.
 * This function helps determine whether a search query is a domain, transaction,
 * block number, token/NFT, or regular address.
 * 
 * @param query - The search string to analyze
 * @param network - The Solana network to use for validation
 * @returns A promise that resolves to the detected search type
 */
export async function detectSearchType(query: string, network: Network): Promise<SearchType> {
  // Handle empty query case
  if (!query) return "address";

  // Check for Solana domain names (e.g., example.sol or example.solana)
  // Domain names can contain alphanumeric characters and hyphens
  if (/^[a-zA-Z0-9-]+\.(sol|solana)$/.test(query)) {
    return "domain";
  }

  // Check for transaction signatures
  // Solana transaction signatures are base58 encoded and typically 87-88 characters long
  if (/^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(query)) {
    return "transaction";
  }

  // Check for block numbers
  // Block numbers are simple numeric values
  if (/^\d+$/.test(query)) {
    return "block";
  }

  // Check for token/NFT addresses
  // Solana addresses are base58 encoded and typically 32-44 characters long
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query)) {
    // First verify if it's a token account
    const isToken = await isTokenAccount(query, network);
    if (isToken) {
      // If it's a token account, try to get metadata to distinguish between token and NFT
      const tokenMetadata = await getTokenMetadata(query);
      return tokenMetadata ? "token" : "NFT";
    }

    // If it's not a token account, return the appropriate type
    return isToken ? "token" : "address";
  }

  // If no other patterns match, assume it's a regular address
  return "address";
}

export async function searchSolana(query: string, network: Network = "mainnet"): Promise<SearchResult> {
  if (!query) {
    throw new Error("Search query cannot be empty");
  }

  const type = await detectSearchType(query, network);
  const connection = getConnection(network);

  switch (type) {
    case "domain": {
      try {
        const domain = query.toLowerCase();
        const { pubkey } = getDomainKeySync(domain);
        console.log(pubkey.toString());
        if (!pubkey) {
          throw new Error("Domain not found");
        }

        // Get account info for the resolved address
        const { registry, nftOwner } = await NameRegistryState.retrieve(connection, pubkey);
        console.log(registry);
        console.log(nftOwner);

        const accountInfo = await connection.getAccountInfo(pubkey);
        if (!accountInfo) {
          throw new Error("Account not found");
        }

        return {
          type: "address",
          network,
          data: {
            ...accountInfo,
            address: pubkey.toString(),
          },
        };
      } catch (error) {
        console.error("Error resolving domain:", error);
        throw new Error("Failed to resolve domain");
      }
    }

    case "address": {
      const accountInfo = await connection.getAccountInfo(new PublicKey(query));
      if (!accountInfo) {
        throw new Error("Account not found");
      }
      return {
        type,
        network,
        data: {
          ...accountInfo,
          address: query,
        },
      };
    }

    case "transaction": {
      try {
        const tx = await connection.getParsedTransaction(query, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });
        if (!tx) {
          throw new Error("Transaction not found");
        }
        return {
          type,
          network,
          data: tx,
        };
      } catch (error) {
        console.error("Error fetching transaction:", error);
        throw new Error("Transaction not found");
      }
    }

    case "block": {
      const block = await connection.getBlock(parseInt(query), {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (!block) {
        throw new Error("Block not found");
      }
      return {
        type,
        network,
        data: block,
      };
    }

    case "token": {
      const tokenAccountInfo = await connection.getAccountInfo(new PublicKey(query));
      if (!tokenAccountInfo) {
        throw new Error("Token account not found");
      }

      // Get the mint address from the token account data
      const mintAddress = new PublicKey(tokenAccountInfo.data.slice(0, 32)).toString();
      const tokenMetadata = await getTokenMetadata(query);

      return {
        type,
        network,
        data: {
          ...tokenAccountInfo,
          address: query,
          mint: mintAddress,
          metadata: tokenMetadata,
        },
      };
    }

    case "NFT": {
      const nftMetadata = await getNFTMetadata(query, network);
      if (!nftMetadata) {
        throw new Error("NFT not found");
      }

      return {
        type,
        network,
        data: {
          address: query,
          metadata: nftMetadata,
        },
      };
    }
  }
}

export function formatSearchResult(result: SearchResult): string {
  if (!result || !result.data) {
    return "# Error\nNo data available";
  }

  const network = result.network.charAt(0).toUpperCase() + result.network.slice(1);

  switch (result.type) {
    case "address": {
      if (!isAddressData(result.data)) {
        return "# Error\nInvalid address data";
      }
      const data = result.data;
      const solBalance = ((data.lamports ?? 0) / 1e9).toFixed(4);
      const address = data.address ?? "Unknown";
      const owner = data.owner?.toString() ?? "Unknown";
      const dataSize = data.data?.length ? (data.data.length / 1024).toFixed(2) : "0";
      const rentEpoch = data.rentEpoch ?? "Unknown";

      return `# Account Details

## Overview
- **Address:** \`${address}\`
- **SOL Balance:** ${solBalance} SOL
- **Lamports:** ${(data.lamports ?? 0).toLocaleString()}
- **Executable:** ${data.executable ? "Yes" : "No"}
- **Data Size:** ${dataSize} KB

## Metadata
- **Owner Program:** \`${owner}\`
- **Rent Epoch:** ${rentEpoch}

## Network
- **Current Network:** ${network}`;
    }

    case "transaction": {
      if (!isTransactionData(result.data)) {
        return "# Error\nInvalid transaction data";
      }
      const data = result.data;
      if (!data?.transaction?.signatures?.[0] || !data?.meta) {
        return "# Error\nTransaction data not available";
      }

      const blockTime = data.blockTime ? new Date(data.blockTime * 1000).toLocaleString() : "Unknown";
      const fee = ((data.meta.fee ?? 0) / 1e9).toFixed(9);
      const status = data.meta.err ? "Failed" : "Success";
      const instructions = data.transaction?.message?.instructions ?? [];

      return `# Transaction Details

## Overview
- **Signature:** \`${data.transaction.signatures[0]}\`
- **Block Time:** ${blockTime}
- **Fee:** ${fee} SOL (${data.meta.fee?.toLocaleString() ?? "0"} lamports)
- **Status:** ${status === "Success" ? "🟢 Success" : "🔴 Failed"}

## Instructions
${instructions
  .map((ix, index) => {
    const programId = ix.programId?.toString() ?? "Unknown";
    const accounts = "accounts" in ix ? (ix.accounts?.length ?? 0) : 0;
    const data = "data" in ix ? (ix.data ?? "No data") : "No data";
    return `
### Instruction ${index + 1}
- **Program:** \`${programId}\`
- **Accounts:** ${accounts}
- **Data:** \`${data}\`
`;
  })
  .join("\n")}`;
    }

    case "block": {
      if (!isBlockData(result.data)) {
        return "# Error\nInvalid block data";
      }
      const data = result.data;
      if (!data) return "# Error\nBlock data not available";

      const blockTime = data.blockTime ? new Date(data.blockTime * 1000).toLocaleString() : "Unknown";
      const transactions = data.transactions ?? [];
      const rewards = data.rewards ?? [];

      return `# Block Information

## Overview
- **Block Height:** ${data.parentSlot ?? "Unknown"}
- **Transaction Count:** ${transactions.length}
- **Block Time:** ${blockTime}

## Block Details
- **Parent Slot:** ${data.parentSlot ?? "Unknown"}
- **Rewards:** ${rewards.length}
- **Block Time:** ${data.blockTime ?? "Unknown"}

## Transactions
${transactions
  .slice(0, 5)
  .map((tx, index) => {
    const signature = tx.transaction?.signatures?.[0] ?? "Unknown";
    const program =
      tx.transaction?.message && "getAccountKeys" in tx.transaction.message
        ? (tx.transaction.message.getAccountKeys().keySegments()[1]?.toString() ?? "Unknown")
        : "Unknown";
    return `
### Transaction ${index + 1}
- **Signature:** \`${signature}\`
- **Program:** \`${program}\`
`;
  })
  .join("\n")}
${transactions.length > 5 ? `\n... and ${transactions.length - 5} more transactions` : ""}`;
    }

    case "token": {
      if (!isTokenData(result.data)) {
        return "# Error\nInvalid token data";
      }
      const data = result.data;
      if (!data) return "# Error\nToken account data not available";

      const dataSize = data.data?.length ? (data.data.length / 1024).toFixed(2) : "0";
      const metadata = data.metadata;

      return `# Token Account Information

## Token Details
${metadata?.logoURI ? `<img src="${metadata.logoURI}" width="48" height="48" style="border-radius: 8px; margin-bottom: 1px;" />` : ""}

### Basic Information
- **Name:** ${metadata?.name ?? "Unknown"}
- **Symbol:** ${metadata?.symbol ?? "Unknown"}
- **Decimals:** ${metadata?.decimals ?? "Unknown"}
${metadata?.description ? `- **Description:** ${metadata.description}` : ""}

### Market Data
${metadata?.marketCap ? `- **Market Cap:** $${metadata.marketCap}` : ""}
${metadata?.liquidity ? `- **Liquidity:** $${metadata.liquidity}` : ""}
${metadata?.totalSupply ? `- **Total Supply:** ${metadata.totalSupply}` : ""}

## Account Information
### Overview
- **Token Account:** \`${data.address ?? "Unknown"}\`
- **Mint Address:** \`${data.mint ?? "Unknown"}\`
- **Owner Program:** \`${data.owner?.toString() ?? "Unknown"}\`
- **Lamports:** ${(data.lamports ?? 0).toLocaleString()}
- **Data Size:** ${dataSize} KB

### Account Details
- **Rent Epoch:** ${data.rentEpoch ?? "Unknown"}
- **Executable:** ${data.executable ? "Yes" : "No"}

## Network
- **Current Network:** ${network}`;
    }

    case "NFT": {
      if (!isNFTData(result.data)) {
        return "# Error\nInvalid NFT data";
      }
      const data = result.data;
      if (!data) return "# Error\nNFT data not available";

      const metadata = data.metadata;

      return `# NFT Information

## NFT Details
${metadata?.image ? `<img src="${metadata.image}" width="200" height="200" style="border-radius: 8px; margin-bottom: 1px;" />` : ""}

### Basic Information
- **Name:** ${metadata?.name ?? "Unknown"}
- **Symbol:** ${metadata?.symbol ?? "Unknown"}
${metadata?.description ? `- **Description:** ${metadata.description}` : ""}

### NFT Properties
- **Mint Address:** \`${data.address ?? "Unknown"}\`
- **Update Authority:** \`${metadata?.updateAuthorityAddress ?? "Unknown"}\`
- **Seller Fee Basis Points:** ${metadata?.sellerFeeBasisPoints ?? "Unknown"}
- **Is Mutable:** ${metadata?.isMutable ? "Yes" : "No"}
- **Primary Sale Happened:** ${metadata?.primarySaleHappened ? "Yes" : "No"}

## Network
- **Current Network:** ${network}`;
    }

    default:
      return "# Error\nUnknown search type";
  }
}

function isAddressData(data: ResultData): data is AddressData {
  return "address" in data && "lamports" in data && "owner" in data;
}

function isTokenData(data: ResultData): data is TokenData {
  return "address" in data && "mint" in data && "metadata" in data;
}

function isNFTData(data: ResultData): data is NFTData {
  return "address" in data && "metadata" in data;
}

function isTransactionData(data: ResultData): data is ParsedTransactionWithMeta {
  return "transaction" in data && "meta" in data;
}

function isBlockData(data: ResultData): data is BlockResponse | VersionedBlockResponse {
  return "parentSlot" in data && "transactions" in data;
}
