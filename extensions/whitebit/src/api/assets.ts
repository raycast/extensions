import { HttpClient } from "./httpClient";

export type AssetResponse = Record<string, Asset>;

export class AssetRequester {
  constructor(private httpClient: HttpClient) {}

  public deposit<T extends AssetResponse>() {
    return this.httpClient.get<T>("/api/v4/public/assets");
  }
}
