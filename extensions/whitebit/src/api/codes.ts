import { HttpClient } from "./httpClient";

export class CodesRequester {
  constructor(private httpClient: HttpClient) {}

  public apply<T extends Code>(code: string, passphrase?: string) {
    return this.httpClient.post<T>(
      "/api/v4/main-account/codes/apply",
      passphrase
        ? {
            code,
            passphrase,
          }
        : { code }
    );
  }

  public create<T extends Code>(ticker: string, amount: string, passphrase?: string) {
    return this.httpClient.post<T>(
      "/api/v4/main-account/codes",
      passphrase
        ? {
            ticker,
            amount,
            passphrase,
          }
        : { ticker, amount },

      {
        headers: {
          "New-Response": "1",
        },
      }
    );
  }

  public list<T extends Code>() {
    return this.httpClient.post<ResponseWrapper<T>>("/api/v4/main-account/codes/history");
  }
}
