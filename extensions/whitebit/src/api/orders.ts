import { HttpClient } from "./httpClient";

export type ExecutedOrdersResponse = Record<string, Array<OrderHistoryItem>>;

export class OrdersRequester {
  constructor(private httpClient: HttpClient) {}

  public executed<T extends ExecutedOrdersResponse>() {
    return this.httpClient.post<T>("/api/v4/trade-account/order/history", {
      offset: 0,
      limit: 100,
    });
  }
}
