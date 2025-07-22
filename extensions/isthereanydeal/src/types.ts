// Type definitions for IsThereAnyDeal API responses

export interface ITADGame {
  id: string;
  slug: string;
  title: string;
  type: string;
  mature: boolean;
  assets: {
    boxart?: string;
  };
}

export interface ITADDeal {
  shop?: {
    name: string;
  };
  price?: {
    amount: string;
    amountInt: number;
    currency: string;
  };
  storeLow?: {
    amount: string;
    amountInt: number;
    currency: string;
  };
  url?: string;
  platforms?: ITADPlatform[];
}

export interface ITADPlatform {
  name: string;
}

export interface ITADPrice {
  amount: string;
  amountInt: number;
  currency: string;
}

export interface ITADDeveloper {
  name: string;
}

export interface ITADBundle {
  title: string;
  date?: string;
}

export interface ITADInfo {
  title?: string;
  slug?: string;
  assets?: {
    boxart?: string;
  };
  tags?: string[];
  developers?: Array<string | ITADDeveloper>;
  release_date?: string;
  reviews?: {
    score_desc?: string;
    score?: string;
  };
  summary?: string;
  description?: string;
}

export interface ITADHistoryEntry {
  timestamp?: number;
  price?: ITADPrice;
  shop?: {
    name: string;
  };
}

export interface ITADData {
  info?: ITADInfo;
  prices?: {
    deals: ITADDeal[];
    historyLow?: {
      all?: ITADPrice;
    };
  };
  history?: {
    list: ITADHistoryEntry[];
  };
  bundles?: {
    list: ITADBundle[];
  };
}
