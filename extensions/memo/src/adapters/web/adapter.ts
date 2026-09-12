import { URL, URLMetadata } from "./dm"

export interface WebAdapter {
    getMetadata(url: URL): Promise<URLMetadata | Error>

    sendHTTPBasicAuthRequest(tokenUrl: string, code: string, redirectUri: string): Promise<any | Error>
}
