export enum Network {
  Mainnet = "Mainnet",
  Ghostnet = "Ghostnet",
}

export type AccountData = {
  balance: string;
  lastActivityTime: string;
  firstActivityTime: string;
};

export type TokenData = {
  balance: string;
  token: {
    contract: { address: string };
    tokenId: string;
    metadata: {
      name: string;
      symbol: string;
      decimals: number;
      displayUri: string;
      artifactUri: string;
      thumbnailUri: string;
    };
  };
};

export type DomainData = {
  name: string;
};

export type OperationData = {
  timestamp: string;
  target: {
    alias: string;
    address: string;
  };
};

export type ContractData = {
  address: string;
  creator: { address: string };
  tokensCount: number;
  tokenBalancesCount: number;
  firstActivityTime: string;
  lastActivityTime: string;
  entrypoints: string[];
};

export type Entrypoint = {
  name: string;
};
