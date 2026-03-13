import { $Fetch, FetchContext, FetchOptions, ofetch } from "ofetch";
import * as crypto from "crypto";
import * as pkg from "../../package.json";

export class HttpClient {
  private readonly _client: $Fetch;

  constructor(private key: string, private secret: string) {
    this._client = ofetch.create({
      baseURL: "https://whitebit.com/",
      onRequest(ctx: FetchContext): Promise<void> | void {
        const { options, request } = ctx;

        const headers: HeadersInit = {};

        if (options.method !== "GET") {
          const data = Object.assign(options.body as object, {
            request,
            nonce: Date.now(),
            nonceWindow: true,
          });

          const payload = Buffer.from(JSON.stringify(data)).toString("base64");
          const hash = crypto.createHmac("sha512", secret);
          const signature = hash.update(payload).digest("hex");

          headers["X-TXC-APIKEY"] = key;
          headers["X-TXC-SIGNATURE"] = signature;
          headers["X-TXC-PAYLOAD"] = payload;

          options.body = data;
        }

        options.headers = {
          ...options.headers,
          ...headers,
          Accept: "application/json",
          "User-Agent": `WhiteBIT Raycast, ${pkg.version}`,
        };
      },
    });
  }

  public get<T, R extends "json" = "json">(url: string, options: FetchOptions<R> = {}) {
    return this.client<T, R>(url, {
      ...options,
      method: "GET",
    });
  }

  public post<T, R extends "json" = "json">(
    url: string,
    body: Record<string, unknown> = {},
    options: FetchOptions<R> = {}
  ) {
    return this.client<T, R>(url, {
      ...options,
      body: body,
      method: "POST",
    });
  }

  get client(): $Fetch {
    return this._client;
  }
}
