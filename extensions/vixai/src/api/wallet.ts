import API from "./base";

export type PortfolioToken = {
  address: string;
  decimals: number;
  logo: string;
  name: string;
  symbol: string;
  amount: string;
  amount_float: string;
  usd_price: number;
  usd_amount: number;
};

export type PortfolioData = {
  address: string;
  total_usd: number;
  tokens: PortfolioToken[];
};

export type TransferParams = {
  mint: string;
  to_address: string;
  amount: number;
};

export type TransferResponse = {
  tx_signature: string;
};

export default class WalletAPI {
  static async getPortfolio(): Promise<PortfolioData> {
    return API.get<PortfolioData>("/wallets/portfolio");
  }

  static async transfer(params: TransferParams): Promise<TransferResponse> {
    return API.post<TransferResponse>("/wallets/instant-transfer", params);
  }
}
