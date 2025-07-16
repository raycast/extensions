/**
 * Open Interest Information Interface
 */
export interface IOpenInterestInfo {
  exchangeLogo: string;
  exchangeName: string;
  h1OIChangePercent: number;
  h1VolChangePercent: number;
  h24Change: number;
  h24VolChangePercent: number;
  h4OIChangePercent: number;
  h4VolChangePercent: number;
  m15OIChangePercent: number;
  m15VolChangePercent: number;
  m30OIChangePercent: number;
  m30VolChangePercent: number;
  m5OIChangePercent: number;
  m5VolChangePercent: number;
  oiVolRadio: number;
  oiVolRadioH1ChangePercent: number;
  oiVolRadioH24ChangePercent: number;
  oiVolRadioH4ChangePercent: number;
  oichangePercent: number;
  openInterest: number;
  openInterestAmount: number;
  openInterestAmountByCoinMargin: number;
  openInterestAmountByStableCoinMargin: number;
  openInterestByCoinMargin: number;
  openInterestByStableCoinMargin: number;
  price: number;
  rate: number;
  symbol: string;
  symbolLogo: string;
  volUsd: number;
  volUsdByCoinMargin: number;
  volUsdByStableCoinMargin: number;
}
