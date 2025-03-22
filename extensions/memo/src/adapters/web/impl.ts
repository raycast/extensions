import { Api as WebApi } from "../../web/api"
import { WebAdapter } from "./adapter"
import { URL, URLMetadata } from "./dm"

export function NewWebAdapter(webApi: WebApi): WebAdapter {
    return new WebAdapterImpl(webApi)
}

class WebAdapterImpl implements WebAdapter {
    private readonly webApi: WebApi

    constructor(webApi: WebApi) {
        this.webApi = webApi
    }

    getMetadata(url: URL): Promise<URLMetadata | Error> {
        return this.webApi.getMetadata(url.text).then((rs) => {
            if (rs instanceof Error) {
                return rs
            }
            if (rs.meta.title === undefined) {
                return new Error(`title metadata not found:${url}`)
            }
            return new URLMetadata(rs.meta.title)
        })
    }

    sendHTTPBasicAuthRequest(tokenUrl: string, code: string, redirectUri: string): Promise<any | Error> {
        return this.webApi
            .sendPOST(tokenUrl, {
                grant_type: "authorization_code",
                code: code,
                redirect_uri: redirectUri,
            })
            .then((res) => {
                if (res instanceof Error) {
                    return res
                }
                return res.json()
            })
    }
}
