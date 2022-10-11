import fetch from "node-fetch"
import {log} from "../util/log"
import {prefs} from "./preferences"
import {salesfoceClient} from "./login"

function apiUrl(path: string, queryParams?: { [key: string]: string }): string {
    const url = new URL(path, `https://${prefs.domain}.my.salesforce.com`).toString()
    const params = new URLSearchParams(queryParams).toString()
    return url + (params.length > 0 ? `?${params}` : "")
}

export async function get<T>(urlPath: string, params?: { [key: string]: string }): Promise<T> {
    const response = await fetch(apiUrl(urlPath, params), {
        method: "GET",
        headers: {
            Authorization: `Bearer ${await salesfoceClient.accessToken()}`
        }
    })
    if (response.status === 401) {
        await salesfoceClient.refreshToken()
        return get(urlPath, params)
    }
    if (response.status >= 400) {
        log(response.status)
        log(await response.text())
        throw Error(`Request failed with status code ${response.status}`)
    } else {
        return await response.json() as T
    }
}