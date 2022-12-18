import { AuthService } from "./auth"
import { TokenInfo } from "../../adapters/raycast/dm"
import { MockWebAdapter } from "../../adapters/web/mock"
import { MockOAuthClient, MockRaycastAdapter } from "../../adapters/raycast/mock"
import { TokenNotFoundError } from "../../adapters/raycast/impl"
import { OAuthTokenResponse } from "../../adapters/web/dm"

const mockOAuthClient = new MockOAuthClient({
    authorize: () => {
        return Promise.resolve({ authorizationCode: "code", redirectURI: "raycast.com" })
    },
})

const mockTokenInfo: TokenInfo = {
    accessToken: "abc",
}
const getMockRaycastAdapter = () =>
    new MockRaycastAdapter({
        getOAuthClient: (provider, icon, desc) => {
            return mockOAuthClient
        },
        getPersistedOAuthToken: (client) => {
            return Promise.resolve(new TokenNotFoundError())
        },
    })
const mockWebAdapter = new MockWebAdapter({
    sendHTTPBasicAuthRequest: (tokenUrl, code, redirectUri) => {
        return Promise.resolve({
            accessToken: mockTokenInfo.accessToken,
        })
    },
})

test("test_auth_service_authorize_success", async () => {
    let storage: OAuthTokenResponse | undefined = undefined
    const mockRaycastAdapter = getMockRaycastAdapter()
    mockRaycastAdapter.persistOAuthToken = (client, token) => {
        storage = token
        return Promise.resolve(null)
    }
    const service = new AuthService(mockRaycastAdapter, mockWebAdapter)

    const result = await service.authorizeNotion()
    expect(result).not.toBeInstanceOf(Error)
    expect(result).toEqual("abc")

    expect(storage).not.toBeUndefined()
    expect(storage!.accessToken).toEqual("abc")
})

test("test_auth_service_authorize_already_done", async () => {
    const mockRaycastAdapter = getMockRaycastAdapter()
    mockRaycastAdapter.getPersistedOAuthToken = (client) => {
        return Promise.resolve(mockTokenInfo)
    }
    const service = new AuthService(mockRaycastAdapter, mockWebAdapter)

    const result = await service.authorizeNotion()
    expect(result).not.toBeInstanceOf(Error)
    expect(result).toEqual("abc")
})

test("test_auth_service_authorize_get_code_error", async () => {
    const mockOAuthClient = new MockOAuthClient({
        authorize: () => {
            return Promise.resolve(new Error("no code"))
        },
    })
    const mockRaycastAdapter = getMockRaycastAdapter()
    mockRaycastAdapter.getOAuthClient = () => mockOAuthClient

    const service = new AuthService(mockRaycastAdapter, mockWebAdapter)

    const result = await service.authorizeNotion()
    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toContain("no code")
})

test("test_auth_service_authorize_get_token_error", async () => {
    const mockWebAdapter = new MockWebAdapter({
        sendHTTPBasicAuthRequest: (tokenUrl, code, redirectUri) => {
            return Promise.resolve(new Error("no token"))
        },
    })

    const service = new AuthService(getMockRaycastAdapter(), mockWebAdapter)

    const result = await service.authorizeNotion()
    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toContain("no token")
})
