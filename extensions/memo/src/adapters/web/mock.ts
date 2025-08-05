import { WebAdapter } from "./adapter"
import { OAuthTokenResponse, URL, URLMetadata } from "./dm"

export type MockWebAdapterParams = {
    getMetadata?: (url: URL) => Promise<URLMetadata | Error>
    sendHTTPBasicAuthRequest?: (
        tokenUrl: string,
        code: string,
        redirectUri: string
    ) => Promise<OAuthTokenResponse | Error>
}

export class MockWebAdapter implements WebAdapter {
    constructor(params: MockWebAdapterParams) {
        if (params.getMetadata) this.getMetadata = params.getMetadata
        if (params.sendHTTPBasicAuthRequest) this.sendHTTPBasicAuthRequest = params.sendHTTPBasicAuthRequest
    }

    getMetadata(url: URL): Promise<URLMetadata | Error> {
        throw new Error("not implemented")
    }

    sendHTTPBasicAuthRequest(tokenUrl: string, code: string, redirectUri: string): Promise<OAuthTokenResponse | Error> {
        throw new Error("not implemented")
    }
}
