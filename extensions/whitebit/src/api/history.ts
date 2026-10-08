import { HttpClient } from "./httpClient";

export type HistoryResponse = {
  records: Array<HistoryItem>;
};

export class HistoryRequester {
  constructor(private httpClient: HttpClient) {}

  public list<T extends HistoryResponse>() {
    return this.httpClient.post<T>("/api/v4/main-account/history", {
      offset: 0,
      limit: 100,
    });
  }
}
