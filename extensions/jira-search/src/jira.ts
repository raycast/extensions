import {getPreferenceValues} from "@raycast/api"
import fetch, {FetchError, Response} from "node-fetch"

const prefs: { domain: string, user: string, token: string } = getPreferenceValues()
export const jiraUrl = `https://${prefs.domain}`

const headers = {
    "Accept": "application/json",
    "Authorization": "Basic " + Buffer.from(`${prefs.user}:${prefs.token}`).toString('base64')
}
const init = {
    headers
}

type QueryParams = { [key: string]: string }

/**
 * Fetches a JSON object of type `Result` or throws an exception if the request fails or returns a non-okay status code.
 * @param path the Jira path (without domain) to fetch
 * @param params an object defining the query params to request
 * @throws if the response's status code is not okay
 * @return the jira response
 */
export async function jiraFetchObject<Result>(path: string, params: QueryParams): Promise<Result> {
    const response = await jiraFetch(path, params)
    return await response.json() as unknown as Result
}

/**
 * Fetches a response from Jira or throws an exception if the request fails or returns a non-okay status code.
 * @param path the Jira path (without domain) to fetch
 * @param params an object defining the query params to request
 * @throws if the response's status code is not okay
 * @return the jira response
 */
export async function jiraFetch(path: string, params: QueryParams): Promise<Response> {
    const paramKeys = Object.keys(params)
    const query = paramKeys.map(key => `${key}=${encodeURI(params[key])}`).join('&')
    try {
        const response = await fetch(`${jiraUrl}/${path}?${query}`, init)
        throwIfResponseNotOkay(response)
        return response
    } catch (error) {
        if (error instanceof FetchError)
            throw Error("Check your network connection")
        else
            throw error
    }
}

function throwIfResponseNotOkay(response: Response) {
    if (!response.ok) {
        const status = response.status
        if (status === 401)
            throw new Error("Jira authentication failed")
        else if (status >= 500)
            throw new Error(`Server error ${status}`)
        else
            throw new Error(`Request error ${status}`)
    }
}