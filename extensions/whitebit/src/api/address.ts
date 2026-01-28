import { HttpClient } from "./httpClient";

export interface AddressResponse {
  account: {
    address: string;
    memo?: string;
  };
}

export class AddressRequester {
  constructor(private httpClient: HttpClient) {}

  public deposit<T extends AddressResponse>(ticker: string, network?: string) {
    return this.httpClient.post<T>("/api/v4/main-account/address", network ? { ticker, network } : { ticker });
  }
}
