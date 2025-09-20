import { HttpClient } from "./httpClient";

export type MarketsResponse = Array<Market>;
export type MarketsActivityResponse = Record<string, MarketActivity>;

export class MarketsRequester {
  constructor(private httpClient: HttpClient) {}

  public list<T extends MarketsResponse>() {
    return this.httpClient.get<T>("/api/v4/public/markets");
  }
  public activity<T extends MarketsActivityResponse>() {
    return this.httpClient.get<T>("/api/v4/public/ticker");
  }
}
