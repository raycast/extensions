import { getPreferenceValues, LocalStorage } from "@raycast/api"
import { FormPayloadType, RequestType, URLType } from "../types"
import Values = LocalStorage.Values

export const commonPreferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()))
  return {
    accessToken: preferencesMap.get("accessToken") as string,
  }
}

export const getURL = (request: RequestType) => {
  if (request.url && request.url.raw) {
    return request.url
  }
  return undefined
}

export const requestHasVariables = (url: URLType) => {
  if (!url.path) return undefined

  const variables = getPathVariables(url.path)

  return variables
}

export const requestHasParams = (url: URLType) => {
  if (!url.path) return undefined

  const params =
    url.query?.length && url.query?.length > 0 ? url.query : undefined

  return params
}

const getPathVariables = (args: Array<string>) => {
  const rgx = new RegExp("{{(.*?)}}", "g")
  const pathVariables = args.filter((arg) => arg.match(rgx))
  return pathVariables.length === 0 ? undefined : pathVariables
}

export const parseRequest = (request: RequestType) => {
  const url = getURL(request)
  if (!url) {
    return undefined
  }
  const variables = requestHasVariables(url)
  const params = requestHasParams(url)

  return {
    url,
    variables,
    params,
  }
}

const parsePath = (payload?: FormPayloadType, path?: Array<string>) => {
  if (!path) {
    return undefined
  }

  if (!payload) {
    return "/" + path.join("/")
  }

  let result = ""
  for (const item of path) {
    if (item in payload) {
      result += `/${payload[item]}`
    } else {
      result += `/${item}`
    }
  }
  let unmatchedParams = "?"
  for (const key in payload) {
    if (!path.includes(key) && payload[key]) {
      unmatchedParams += `${key}=${payload[key]}&`
    }
  }

  return (
    result +
    (unmatchedParams.length > 1
      ? unmatchedParams.substring(0, unmatchedParams.length - 1)
      : "")
  )
}

export const prepareFinalURL = (url: URLType, payload?: FormPayloadType) => {
  const { host, path, protocol, raw } = url
  if (!raw || !host || !protocol) {
    return
  }

  return protocol + "://" + host.join(".") + parsePath(payload, path)
}

export const getMarkdown = (content: string) => "```" + content

export const prettifyPathVariables = (str: string) => {
  return str
    .replace("{{", "")
    .replace("}}", "")
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ")
}
