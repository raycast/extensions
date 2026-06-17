import validator from "validator"

export class URL {
    private readonly _text: string

    private constructor(text: string) {
        this._text = text
    }

    get text(): string {
        return this._text
    }

    static fromString(s: string): URL | Error {
        if (!validator.isURL(s)) {
            return new Error(`not a URL:${s}`)
        }

        return new URL(s)
    }
}

export class URLMetadata {
    private readonly _title: string

    constructor(title: string) {
        this._title = title
    }

    get title(): string {
        return this._title
    }
}

/** Standard response of Token Exchange step in OAuth **/
export type OAuthTokenResponse = {
    accessToken: string
    /**
     * An optional refresh token returned by an OAuth token request.
     */
    refreshToken?: string
    /**
     * An optional id token returned by an identity request (e.g. /me, Open ID Connect).
     */
    idToken?: string
    /**
     * An optional expires value (in seconds) returned by an OAuth token request.
     */
    expiresIn?: number
    /**
     * The optional scope value returned by an OAuth token request.
     */
    scope?: string
}
