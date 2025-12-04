export const SOLANA_RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";
export const USER_WALLET_ADDRESS_KEY = "userSolanaWalletAddress";
export const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

export const KNOWN_TOKENS_MAP: Record<string, { symbol: string; name: string; decimals?: number }> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  },
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: {
    symbol: "JitoSOL",
    name: "Jito Staked SOL",
    decimals: 9,
  },
  "6AJcP7wuLwmRYLBNbi825wgguaPsWzPBEHcHndpRpump": {
    symbol: "VINE",
    name: "Vine Coin",
    decimals: 6,
  },
  "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv": {
    symbol: "PENGU",
    name: "Pudgy Penguins",
    decimals: 6,
  },
};
