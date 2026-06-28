import parser, { Metadata } from "html-metadata-parser"
import fetch, { Response } from "node-fetch"

export class Api {
    getMetadata(url: string): Promise<Metadata | Error> {
        return parser(url, {
            timeout: 3000,
        }).catch((err) => {
            return new Error(`${err}:get url metadata fails:${url}`)
        })
    }

    sendPOST(url: string, body: object): Promise<Response | Error> {
        console.log(`POST request, url=${url}, body=${body}`)

        return fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        })
            .then((res) => {
                console.log(`POST response, url=${url}, body=${body}, response=${res}`)
                return res
            })
            .catch((err) => {
                console.error(`POST response, url=${url}, body=${body}`)
                return new Error(`${err}:POST request`)
            })
    }
}
