import { OAuthClient, RaycastAdapter } from "./adapter"
import { OAuthAuthorizeResponse, TokenInfo } from "./dm"
import { OAuth, Toast } from "@raycast/api"
import { Page } from "../../core/dm"
import { OAuthTokenResponse } from "../web/dm"

export type MockOAuthClientParams = {
    authorize?: () => Promise<OAuthAuthorizeResponse | Error>
    getUnderlyingClient?: () => OAuth.PKCEClient
}

export class MockOAuthClient implements OAuthClient {
    constructor(params: MockOAuthClientParams) {
        if (params.authorize) this.authorize = params.authorize
        if (params.getUnderlyingClient) this.getUnderlyingClient = params.getUnderlyingClient
    }

    authorize(): Promise<OAuthAuthorizeResponse | Error> {
        throw new Error("not implemented")
    }

    getUnderlyingClient(): OAuth.PKCEClient {
        throw new Error("not implemented")
    }
}

export type MockRaycastAdapterParams = {
    getOAuthClient?: (provider: string, icon: string, desc: string) => OAuthClient
    getPersistedOAuthToken?: (client: OAuthClient) => Promise<TokenInfo | Error>
    persistOAuthToken?: (client: OAuthClient, token: OAuthTokenResponse) => Promise<Error | null>
}

export class MockRaycastAdapter implements RaycastAdapter {
    constructor(params: MockRaycastAdapterParams) {
        if (params.getOAuthClient) this.getOAuthClient = params.getOAuthClient
        if (params.getPersistedOAuthToken) this.getPersistedOAuthToken = params.getPersistedOAuthToken
        if (params.persistOAuthToken) this.persistOAuthToken = params.persistOAuthToken
    }

    closeExtension(): Promise<void> {
        throw new Error("not implemented")
    }

    getCopiedText(): Promise<string | Error> {
        throw new Error("not implemented")
    }

    getOAuthClient(provider: string, icon: string, desc: string): OAuthClient {
        throw new Error("not implemented")
    }

    getPersistedLastSelectedPage(): Promise<Page | Error> {
        throw new Error("not implemented")
    }

    getPersistedOAuthToken(client: OAuthClient): Promise<TokenInfo | Error> {
        throw new Error("not implemented")
    }

    persistLastSelectedPage(page: Page): Promise<Error | null> {
        throw new Error("not implemented")
    }

    persistOAuthToken(client: OAuthClient, token: OAuthTokenResponse): Promise<Error | null> {
        throw new Error("not implemented")
    }

    setToastError(toast: Toast, err: Error): void {
        throw new Error("not implemented")
    }

    setToastSuccess(toast: Toast, msg: string): void {
        throw new Error("not implemented")
    }

    showHUD(msg: string): Promise<void> {
        throw new Error("not implemented")
    }

    showLoading(msg: string): Promise<Toast> {
        throw new Error("not implemented")
    }
}
