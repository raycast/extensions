import { Page } from "../../core/dm"
import { OAuthAuthorizeResponse, Toast, TokenInfo } from "./dm"
import { OAuthTokenResponse } from "../web/dm"
import { OAuth } from "@raycast/api"

export interface OAuthClient {
    authorize(): Promise<OAuthAuthorizeResponse | Error>

    getUnderlyingClient(): OAuth.PKCEClient
}

export interface RaycastAdapter {
    getCopiedText(): Promise<string | Error>

    persistLastSelectedPage(page: Page): Promise<null | Error>

    getPersistedLastSelectedPage(): Promise<Page | Error>

    showHUD(msg: string): Promise<void>

    showLoading(msg: string): Promise<Toast>

    setToastError(toast: Toast, err: Error): void

    setToastSuccess(toast: Toast, msg: string): void

    closeExtension(): Promise<void>

    getOAuthClient(provider: string, icon: string, desc: string): OAuthClient

    persistOAuthToken(client: OAuthClient, token: OAuthTokenResponse): Promise<null | Error>

    getPersistedOAuthToken(client: OAuthClient): Promise<TokenInfo | Error>
}
