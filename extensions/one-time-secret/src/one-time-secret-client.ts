import fetch, { Headers, RequestInit, Response } from "node-fetch";

export class OneTimeSecretClient {
  baseUrl: string;

  constructor() {
    this.baseUrl = "https://onetimesecret.com";
  }

  public getShareableUrl(secret_key: string): string {
    return `${this.baseUrl}/secret/${secret_key}`;
  }

  public async storeAnonymousSecret(
    secret: string,
    ttl: string,
    passphrase: string | null = null
  ): Promise<OneTimeSecretResponse> {
    const body = new URLSearchParams();
    body.append("secret", secret);
    body.append("ttl", ttl);

    if (passphrase) {
      body.append("passphrase", passphrase);
    }

    return await this.post(body);
  }

  private async post(body: URLSearchParams): Promise<OneTimeSecretResponse> {
    const init: RequestInit = {
      method: "POST",
      headers: new Headers([["content-type", "application/x-www-form-urlencoded"]]),
      body: body.toString(),
    };

    const url = new URL(`${this.baseUrl}/api/v1/share`);
    const response: Response = await fetch(url.href, init);
    const data: OneTimeSecretResponse = (await response.json()) as OneTimeSecretResponse;
    console.log(data);

    return data;
  }
}

export type OneTimeSecretResponse = {
  custid: string;
  metadata_key: string;
  secret_key: string;
  ttl: number;
  metadata_ttl: number;
  secret_ttl: number;
  state: string;
  updated: number;
  created: number;
  recipient: Array<string>;
  passphrase_required: string;
};
