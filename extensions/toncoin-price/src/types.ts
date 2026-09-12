import { sourceNames } from "@/sources/useSource";

export interface OKXResponse {
  code: string;
  msg: string;
  data: {
    instType: string;
    instId: string;
    last: string;
    lastSz: string;
    askPx: string;
    askSz: string;
    bidPx: string;
    bidSz: string;
    open24h: string;
    high24h: string;
    low24h: string;
    volCcy24h: string;
    vol24h: string;
    ts: string;
    sodUtc0: string;
    sodUtc8: string;
  }[];
}

export interface BybitResponse {
  retCode: number;
  retMsg: string;
  result: {
    category: string;
    list: {
      symbol: string;
      bidPrice: string;
      askPrice: string;
      lastPrice: string;
      lastTickDirection: string;
      prevPrice24h: string;
      price24hPcnt: string;
      highPrice24h: string;
      lowPrice24h: string;
      prevPrice1h: string;
      markPrice: string;
      indexPrice: string;
      openInterest: string;
      turnover24h: string;
      volume24h: string;
      fundingRate: string;
      nextFundingTime: string;
      predictedDeliveryPrice: string;
      basisRate: string;
      deliveryFeeRate: string;
      deliveryTime: string;
      openInterestValue: string;
    }[];
  };
  retExtInfo: object;
  time: number;
}

export interface CommonResponse {
  lastPrice: string;
  timestamp: string;
}

export type SourceName = (typeof sourceNames)[number];

export type UseSource = () => {
  isLoading: boolean;
  data: CommonResponse | undefined;
  error: Error | undefined;
};

export interface Perferences {
  source: SourceName;
}
