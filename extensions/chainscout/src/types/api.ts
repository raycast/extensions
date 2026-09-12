export interface ExplorerInfo {
  url: string;
  hostedBy: string;
}

export interface ChainInfo {
  name: string;
  description: string;
  logo: string;
  website: string;
  chainId: string;
  explorers: Array<ExplorerInfo>;
  isTestnet: boolean;
  layer: number;
  rollupType: string | undefined;
  ecosystem: Array<string> | string | undefined;
  featured?: boolean;
}
