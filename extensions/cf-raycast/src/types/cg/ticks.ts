export interface Depth {
  askTotal: number;
  depth: number;
  asks: number[][];
  bids: number[][];
  bidTotal: number;
}

export interface Tick {
  buyTurnoverNumber: number;
  depth: Depth;
  exName: string;
  exchangeLogo: string;
  fundingRate: number;
  h24LongLiquidationUsd: number;
  h24PriceChangePercent: number;
  h24ShortLiquidationUsd: number;
  indexPrice: number;
  instrumentId: string;
  longRate: number;
  longVolUsd: number;
  marketUrl: string;
  nextFundingTime: number;
  oiVolRadio: number;
  openInterest: number;
  openInterestAmount: number;
  price: number;
  sellTurnoverNumber: number;
  shortRate: number;
  shortVolUsd: number;
  symbol: string;
  type: number;
  volUsd: number;
}
