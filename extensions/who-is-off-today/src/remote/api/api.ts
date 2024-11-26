import { ListEmployments, ListEmploymentsParams } from "./models/employment";
import { ListTimeOffParams, ListTimeOffs } from "./models/timeoff";
import fetch from "node-fetch";
import { Request } from "./request";

export class RemoteApi {
    private baseUrl;
    constructor(
        private apiKey: string,
        sandbox = false,
        private _fetch: typeof fetch = fetch,
    ) {
        this.baseUrl = sandbox ? "https://gateway.remote-sandbox.com/v1/" : "https://gateway.remote.com/v1/";
    }

    listEmployments(params?: ListEmploymentsParams) {
        return this.requestGet<ListEmployments>("employments").params(params as unknown as Params);
    }

    listTimeOffs(params?: ListTimeOffParams) {
        return this.requestGet<ListTimeOffs>("timeoff").params(params as unknown as Params);
    }

    private requestGet<T>(endpoint: string) {
        return Request.new<T>(this._fetch)
            .headers({
                Accept: "application/json",
                Authorization: `Bearer ${this.apiKey}`,
            })
            .get(`${this.baseUrl}${endpoint}`);
    }
}

export type Params = Record<string, string>;
export type Headers = Record<string, string>;
