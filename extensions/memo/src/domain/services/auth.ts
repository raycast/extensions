import { NOTION_TOKEN_URL } from "../../config"
import { RaycastAdapter } from "../../adapters/raycast/adapter"
import { WebAdapter } from "../../adapters/web/adapter"
import { OAuthTokenResponse } from "../../adapters/web/dm"
import { TokenNotFoundError } from "../../adapters/raycast/impl"

export type NotionApiToken = string

export class AuthService {
    private readonly raycastAdapter: RaycastAdapter
    private readonly webAdapter: WebAdapter

    constructor(raycastAdapter: RaycastAdapter, webAdapter: WebAdapter) {
        this.raycastAdapter = raycastAdapter
        this.webAdapter = webAdapter
    }

    async authorizeNotion(): Promise<NotionApiToken | Error> {
        const client = this.raycastAdapter.getOAuthClient(
            "Notion",
            "notion_icon.png",
            "Authorize Notion to allow saving your content.\nWe never read your existing content.\nWe never share your content with anyone."
        )
        const existingToken = await this.raycastAdapter.getPersistedOAuthToken(client)
        if (!(existingToken instanceof Error) && !(existingToken instanceof TokenNotFoundError)) {
            return existingToken.accessToken
        }

        const authResponse = await client.authorize()
        if (authResponse instanceof Error) {
            return authResponse
        }

        console.log("get notion auth code successful")
        const authCode = authResponse.authorizationCode

        const tokenResponse = await this.getNotionOAuthToken(authCode, authResponse.redirectURI)
        if (tokenResponse instanceof Error) {
            return tokenResponse
        }

        await this.raycastAdapter.persistOAuthToken(client, tokenResponse)
        return tokenResponse.accessToken
    }

    private async getNotionOAuthToken(code: string, redirectUri: string): Promise<OAuthTokenResponse | Error> {
        const response = await this.webAdapter.sendHTTPBasicAuthRequest(NOTION_TOKEN_URL, code, redirectUri)
        if (response instanceof Error) {
            return new Error(`${response}:get Notion OAuth token`)
        }
        return {
            accessToken: response.accessToken ?? response.access_token,
        }
    }
}
