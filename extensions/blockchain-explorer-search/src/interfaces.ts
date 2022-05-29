export interface Explorer {
  chainName: string;
  explorerName: string;
  baseUrl: string;
  chainId: number;
  currency: string;
  testNet?: boolean;
  assetUri?: string;
  imageUrl?: string;
}
export interface Token {
  address: string;
  chainId: number;
  name: string;
  symbol: string;
  decimals: number;
}
