export interface Explorer {
  chainName: string;
  networkName: string;
  explorerName: string;
  baseUrl: string;
  chainId: string;
  imageUrl?: string;
  iconUri: string;
}
export interface Token {
  address: string;
  chainId: number;
  name: string;
  symbol: string;
  decimals: number;
}

export interface SupportedChain {
  chain: string;
  networks: Network[];
  url: string;
  // Add other properties of supportedChain here
}

export interface Network {
  network: string;
  // Add other properties of supportedNetwork here
}
