import { Api as RaycastApi } from "../../raycast/api"
import { DeserializedPage, Page } from "../../core/dm"
import {
    NOTION_OAUTH_AUTHORIZE_URL,
    NOTION_OAUTH_CLIENT_ID,
    NOTION_OAUTH_PROXY_REDIRECT_URL,
    NOTION_OAUTH_SCOPE,
    NOTION_RECENT_PAGE_PERSISTENCE_KEY,
} from "../../config"
import { OAuthClient, RaycastAdapter } from "./adapter"
import { OAuthAuthorizeResponse, Toast, TokenInfo } from "./dm"
import { OAuthTokenResponse } from "../web/dm"
import { OAuth } from "@raycast/api"

export function NewRaycastAdapter(raycastApi: RaycastApi): RaycastAdapter {
    return new RaycastAdapterImpl(raycastApi)
}

export function serializePage(page: Page): string | Error {
    const rs = JSON.stringify(page)
    if (rs === undefined) {
        return new Error("serialize page failed")
    }

    return rs
}

export function deserializePage(s: string): Page | Error {
    const dp = <DeserializedPage>JSON.parse(s)
    return new Page(dp._id, dp._title, dp._type, dp._icon)
}

export function NewOAuthClient(raycastClient: OAuth.PKCEClient): OAuthClient {
    return new OAuthClientImpl(raycastClient)
}

class OAuthClientImpl implements OAuthClient {
    private readonly _raycastClient: OAuth.PKCEClient

    constructor(raycastClient: OAuth.PKCEClient) {
        this._raycastClient = raycastClient
    }

    getUnderlyingClient(): OAuth.PKCEClient {
        return this._raycastClient
    }

    async authorize(): Promise<OAuthAuthorizeResponse | Error> {
        const authRequest = await this.getOAuthRequestForNotion()
        if (authRequest instanceof Error) {
            return authRequest
        }
        console.log("get notion auth request successful")

        return await this.sendAuthorizeRequest(authRequest)
    }

    private getOAuthRequestForNotion(): Promise<OAuth.AuthorizationRequest | Error> {
        return this._raycastClient
            .authorizationRequest({
                endpoint: NOTION_OAUTH_AUTHORIZE_URL,
                clientId: NOTION_OAUTH_CLIENT_ID,
                scope: NOTION_OAUTH_SCOPE,
                extraParameters: {
                    owner: "user",
                },
            })
            .catch((err) => {
                console.error(err)
                return new Error(`${err}:get notion auth request`)
            })
    }

    private sendAuthorizeRequest(request: OAuth.AuthorizationRequest): Promise<OAuthAuthorizeResponse | Error> {
        return this._raycastClient
            .authorize(request)
            .then((response) => {
                return { authorizationCode: response.authorizationCode, redirectURI: NOTION_OAUTH_PROXY_REDIRECT_URL }
            })
            .catch((err) => {
                console.error(err)
                return new Error(`${err}:send auth request`)
            })
    }
}

class RaycastAdapterImpl implements RaycastAdapter {
    private readonly raycastApi: RaycastApi

    constructor(raycastApi: RaycastApi) {
        this.raycastApi = raycastApi
    }

    getCopiedText(): Promise<string | Error> {
        return this.raycastApi.getClipboardText()
    }

    persistLastSelectedPage(page: Page): Promise<null | Error> {
        const serialized = serializePage(page)
        if (serialized instanceof Error) {
            return Promise.resolve(serialized)
        }

        return this.raycastApi.persistToLocalStorage(NOTION_RECENT_PAGE_PERSISTENCE_KEY, JSON.stringify(page))
    }

    getPersistedLastSelectedPage(): Promise<Page | Error> {
        return this.raycastApi.getFromLocalStorage(NOTION_RECENT_PAGE_PERSISTENCE_KEY).then((rs) => {
            if (rs instanceof Error) {
                return rs
            }

            const json = <string>rs
            return deserializePage(json)
        })
    }

    showHUD(msg: string): Promise<void> {
        return this.raycastApi.showHUD(msg)
    }

    showLoading(msg: string): Promise<Toast> {
        return this.raycastApi.showLoadingToast(msg)
    }

    setToastError(toast: Toast, err: Error): void {
        return this.raycastApi.setToastFailure(toast, err.message)
    }

    setToastSuccess(toast: Toast, msg: string): void {
        return this.raycastApi.setToastSuccess(toast, msg)
    }

    closeExtension(): Promise<void> {
        return this.raycastApi.popToRoot()
    }

    getOAuthClient(provider: string, icon: string, desc: string): OAuthClient {
        const raycastClient = this.raycastApi.getOAuthClient(provider, icon, desc)
        return NewOAuthClient(raycastClient)
    }

    persistOAuthToken(client: OAuthClient, token: OAuthTokenResponse): Promise<null | Error> {
        return this.raycastApi.persistOAuthToken(client.getUnderlyingClient(), token)
    }

    getPersistedOAuthToken(client: OAuthClient): Promise<TokenInfo | Error> {
        return this.raycastApi.getPersistedOAuthToken(client.getUnderlyingClient()).then((token) => {
            if (!token) {
                return new TokenNotFoundError()
            }
            return token
        })
    }
}

export class TokenNotFoundError implements Error {
    name = "token_not_found_error"
    message = ""
}
