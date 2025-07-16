/**
 * 资金费率
 */
export interface Margin {
  exchangeLogo: string;
  exchangeName: string;
  fundingIntervalHours: number;
  nextFundingTime: number;
  rate: number;
  status: 1;
}

export interface FundingRateHome {
  cIndexPrice: number;
  cMarginList: Margin[];
  uMarginList: Margin[];
  cPrice: number;
  status: number;
  symbol: string;
  symbolLogo: string;
  uIndexPrice: number;
  uPrice: number;
}
