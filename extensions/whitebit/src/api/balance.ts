import { HttpClient } from "./httpClient";

export type MainBalanceResponse = Record<string, MainBalance>;

export type TradeBalanceResponse = Record<string, TradeBalance>;
export type CollateralBalanceResponse = CollateralBalance;

export interface TransferRequestPayload extends Record<string, unknown> {
  from: string;
  to: string;
  ticker: Ticker;
  amount: string;
}
export class BalanceRequester {
  constructor(private httpClient: HttpClient) {}

  public main<T extends MainBalanceResponse>() {
    return this.httpClient.post<T>("/api/v4/main-account/balance");
  }

  public trade<T extends TradeBalanceResponse>() {
    return this.httpClient.post<T>("/api/v4/trade-account/balance");
  }

  public collateral<T extends CollateralBalanceResponse>() {
    return this.httpClient.post<T>("/api/v4/collateral-account/balance");
  }

  public transfer(payload: TransferRequestPayload) {
    return this.httpClient.post("/api/v4/main-account/transfer", payload);
  }
}
