export type MatchType = "transaction" | "address" | "block" | "token" | "ens" | "signature";

export interface PathConfig {
  transaction?: string;
  address?: string;
  block?: string;
  token?: string;
  ens?: string;
  signature?: string;
}

export interface PatternConfig {
  // Pattern matching configuration
  transaction?: {
    regex: string;
    normalize?: (input: string) => string;
  };
  address?: {
    regex: string;
    normalize?: (input: string) => string;
  };
  signature?: {
    regex: string;
    normalize?: (input: string) => string;
  };
  block?: {
    regex: string;
    normalize?: (input: string) => string;
  };
  ens?: {
    regex: string;
    normalize?: (input: string) => string;
  };
  token?: {
    regex: string;
    normalize?: (input: string) => string;
  };
}

export interface ExplorerConfig {
  // Custom path configuration for this explorer
  paths?: PathConfig;
  // Custom pattern matching rules
  patterns?: PatternConfig;
  // Whether to use custom patterns exclusively (ignore defaults)
  useCustomPatternsOnly?: boolean;
}

export interface Explorer {
  chainName: string;
  explorerName: string;
  baseUrl: string;
  chainId: number;
  currency: string;
  iconUri: string;
  testNet?: boolean;
  imageUrl?: string;
  // New: Custom explorer configuration
  config?: ExplorerConfig;
}

export interface Token {
  address: string;
  chainId: number;
  name: string;
  symbol: string;
  decimals: number;
}
