export interface ICoinDetailsResp {
  markdown: string;
  base_coin: ICoinDetails;
}

export interface ICoinDetails {
  id: string;
  symbol: string;
  image: string;
  name: string;
  asset_platform_id: string;
  description: string;
  market_data: IMarketData;
}

export interface IMarketData {
  current_price: number;
  market_cap: number;
  percentage_1h: number;
  percentage_24h: number;
  percentage_7d: number;
}
