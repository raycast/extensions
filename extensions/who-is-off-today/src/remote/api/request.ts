import fetch, { RequestInfo, Response } from "node-fetch";
import { Headers, Params } from "./api";
import { Payload } from "./models/payload";
import { Page } from "./models/page";

export class Request<T = unknown> {
    private _url: RequestInfo = "";
    private _params?: Params;
    private _headers?: Headers;
    constructor(private _fetch: typeof fetch = fetch) {}

    static new<T = unknown>(fetchFn: typeof fetch = fetch) {
        return new Request<T>(fetchFn);
    }

    get(url: RequestInfo) {
        this._url = url;
        return this;
    }

    params(params?: Params) {
        this._params = { ...this._params, ...params };
        return this;
    }

    headers(headers: Headers) {
        this._headers = { ...this._headers, ...headers };
        return this;
    }

    async allPages(): Promise<T[]> {
        const data = [];
        let response = (await this.params({ page_size: "100" }).send()) as Payload<Page<unknown>>;
        data.push(response.data);
        while (response.data.current_page < response.data.total_pages) {
            response = (await this.params({ page: (response.data.current_page + 1).toString() }).send()) as Payload<
                Page<unknown>
            >;
            data.push(response.data);
        }
        return data as T[];
    }

    async send() {
        return (
            await this._fetch(`${this._url}${urlParams(this._params)}`, {
                headers: this._headers,
            }).then(mapError)
        ).json() as Promise<Payload<T>>;
    }
}

function urlParams(params?: Params) {
    return params ? `?${new URLSearchParams(params)}` : "";
}

function mapError(response: Response) {
    if (response.status === 401 || response.status === 403) throw new Error("Unauthorized Error!");
    if (response.status !== 200) throw new Error("Unknown Error!");
    return response;
}
