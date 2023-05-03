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
    name: boolean;
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
