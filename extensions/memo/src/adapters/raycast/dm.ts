// we need to use this type because:
// - we don't want to leak raycast's Toast type to our domain code
// - test doesn't work because @raycast/api is just a type
// declaration file, so Jest cannot resolve it
import { OAuth } from "@raycast/api"

export type Toast = any
export type TokenInfo = {
    accessToken: string
}
export type TokenResponse = OAuth.TokenResponse

export type OAuthAuthorizeResponse = {
    authorizationCode: string
    redirectURI: string
}
