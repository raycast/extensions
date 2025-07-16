export interface IExchangeInfo {
  exchangeName: string;
  liquidationVolUsd: number;
  logo: string;
  makerFee: number;
  oiChangePercent: number;
  oiVolRadio: number;
  oiVolRadioChangePercent: number;
  openInterest: number;
  optionInfo: {
    openInterestUsd: number;
    volUsd: number;
  };
  pair: number;
  rating: string;
  takerFee: number;
  url: string;
  volChangePercent: number;
  volUsd: number;
}
