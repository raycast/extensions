export type FloorPriceResponse = {
  amount: {
    atomicAmount: string;
    wholeAmount: number;
  };
  currencyInfo: {
    address: string;
    decimals: number;
    isNative: boolean;
    symbol: string;
  };
};

type TokenVolume = {
  atomicAmount: string;
  wholeAmount: number;
};

type CurrencyInfo = {
  symbol: string;
  decimals: number;
  address: string;
  isNative: boolean;
};

export type VolumeResponse = {
  currencyInfo: CurrencyInfo;
  oneDayVolume: TokenVolume;
  sevenDayVolume: TokenVolume;
  thirtyDayVolume: TokenVolume;
};

export type CollectionResponse = {
  address: string;
  creator: string;
  isSpam: boolean;
  name: string;
  numAssets: number;
  owner: string;
  smallPreviewImageUrl: string;
  small_preview_image_url: string;
  spamReasons: string[];
  symbol: string;
  url: string;
};

export type AssetDetailsResponse = {
  address: string;
  tokenId: string;
  isSpam: boolean;
  collectionName: string;
  name: string;
  owner: string;
  smallPreviewImageUrl: string;
  small_preview_image_url: string;
  spamReasons: string[];
  symbol: string;
  url: string;
  metadata: {
    attributes: {
      trait_type: string;
      value: string;
    }[];
  };
};

export type SearchResponse = {
  results: {
    address: string;
    id: string;
    name: string;
    previewImageUrl: string;
    relevance: number;
    tokenId: string;
    type: string;
  }[];
};

export type UseContractsOfOwnersResponse = {
  contracts: {
    address: string;
    isSpam: boolean;
    media: {
      gateway: string;
      raw: string;
    };
    name: string;
    numDistinctTokensOwned: number;
    ownedCount: number;
    symbol: string;
    tokenID: string;
    tokenType: string;
    totalBalance: number;
  }[];
  totalCount: 2;
};

export type TransferHistoryResponse = {
  items: {
    address: string;
    blockNumber: number;
    from: string;
    logIndex: number;
    network: string;
    to: string;
    tokenId: string;
  }[];
};
