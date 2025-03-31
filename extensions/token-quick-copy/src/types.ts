export interface Token {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}

export interface TokenList {
  name: string;
  timestamp: string;
  version: {
    major: number;
    minor: number;
    patch: number;
  };
  tokens: Token[];
}

export interface UserPreferences {
  favoriteTokens: string[]; // Array of token addresses
  enabledChains: number[]; // Array of chain IDs
  activeTokenLists: string[]; // Array of token list URLs
  refreshInterval: "daily" | "weekly";
}

export interface SearchResult {
  token: Token;
  isFavorite: boolean;
  lastSelected?: Date;
}
