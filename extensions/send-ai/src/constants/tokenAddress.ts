// Solana token addresses and metadata
export const WRAPPED_SOL_ADDRESS = "So11111111111111111111111111111111111111112";

export const SOL = {
  name: "SOL",
  symbol: "SOL",
  address: "So11111111111111111111111111111111111111111",
  logoURI:
    "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
} as const;

export const USDC = {
  name: "USD Coin",
  symbol: "USDC",
  address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  chainId: "solana",
  logoURI:
    "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
} as const;

// Common token addresses for easy reference
export const COMMON_TOKENS = {
  SOL,
  USDC,
} as const;
