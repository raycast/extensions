import { MethodsType, HeaderType, URLType, BodyType } from "../types"
import { convert, validate } from "curl-to-postmanv2"
import { promisify } from "util"

export interface ParsedCurl {
  method: MethodsType
  url: URLType
  headers?: HeaderType[]
  body?: BodyType
}

// Types for the curl-to-postmanv2 library output
interface PostmanHeader {
  key: string
  value: string
  type?: string
  disabled?: boolean
}

interface PostmanUrlEncodedItem {
  key: string
  value: string
  disabled?: boolean
}

interface PostmanFormDataItem {
  key: string
  value: string
  type?: string
  disabled?: boolean
}

interface PostmanBody {
  mode?: "raw" | "urlencoded" | "formdata"
  raw?: string
  urlencoded?: PostmanUrlEncodedItem[]
  formdata?: PostmanFormDataItem[]
  options?: {
    raw?: {
      language?: string
    }
  }
}

interface PostmanRequest {
  method?: string
  url?: string | { raw?: string }
  header?: PostmanHeader[]
  body?: PostmanBody
}

// Promisify the callback-based convert function
const convertAsync = promisify(convert)

/**
 * Parses a cURL command string and converts it to Postman request format
 * Uses the official Postman Labs curl-to-postmanv2 library
 */
export const parseCurl = async (curlCommand: string): Promise<ParsedCurl | { error: string }> => {
  try {
    // Validate the cURL command first
    const validation = validate(curlCommand.trim())
    if (!validation.result) {
      return { error: validation.reason || "Invalid cURL command" }
    }

    // Convert using the official library
    const result = await convertAsync({
      type: "string",
      data: curlCommand.trim(),
    })

    if (!result || !result.output || result.output.length === 0) {
      return { error: "Failed to convert cURL command" }
    }

    const postmanRequest = result.output[0].data as PostmanRequest

    // Extract method
    const method = (postmanRequest.method || "GET").toUpperCase() as MethodsType

    // Extract URL
    if (!postmanRequest.url) {
      return { error: "No URL found in cURL command" }
    }

    const urlString = typeof postmanRequest.url === "string" ? postmanRequest.url : postmanRequest.url.raw || ""

    let url: URLType
    try {
      const urlObj = new URL(urlString)
      url = {
        raw: urlString,
        protocol: urlObj.protocol.replace(":", "") as "https" | "http",
        host: urlObj.hostname.split("."),
        path: urlObj.pathname.split("/").filter((p) => p),
        query: parseQueryString(urlObj.search),
      }
    } catch {
      return { error: "Invalid URL format" }
    }

    // Extract headers
    const headers: HeaderType[] = []
    if (postmanRequest.header && Array.isArray(postmanRequest.header)) {
      postmanRequest.header.forEach((header: PostmanHeader) => {
        if (header.key && header.value) {
          headers.push({
            key: header.key,
            value: header.value,
            type: header.type || "text",
            disabled: header.disabled || false,
          })
        }
      })
    }

    // Extract body
    let body: BodyType | undefined
    if (postmanRequest.body) {
      const postmanBody = postmanRequest.body

      if (postmanBody.mode === "raw") {
        body = {
          mode: "raw",
          raw: postmanBody.raw || "",
          options: postmanBody.options || {
            raw: {
              language: postmanBody.options?.raw?.language || "text",
            },
          },
        }
      } else if (postmanBody.mode === "urlencoded" && postmanBody.urlencoded) {
        body = {
          mode: "urlencoded",
          urlencoded: Array.isArray(postmanBody.urlencoded)
            ? postmanBody.urlencoded.map((item: PostmanUrlEncodedItem) => ({
                key: item.key || "",
                value: item.value || "",
                disabled: item.disabled || false,
              }))
            : [],
        }
      } else if (postmanBody.mode === "formdata" && postmanBody.formdata) {
        body = {
          mode: "formdata",
          formdata: Array.isArray(postmanBody.formdata)
            ? postmanBody.formdata.map((item: PostmanFormDataItem) => ({
                key: item.key || "",
                value: item.value || "",
                type: item.type || "text",
                disabled: item.disabled || false,
              }))
            : [],
        }
      }
    }

    return {
      method,
      url,
      headers: headers.length > 0 ? headers : undefined,
      body,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to parse cURL command"
    return { error: errorMessage }
  }
}

/**
 * Parses query string into Postman query parameter format
 */
function parseQueryString(search: string): Array<{ key: string; value: string; type: string; disabled: boolean }> {
  if (!search || search === "?") {
    return []
  }

  const params: Array<{
    key: string
    value: string
    type: string
    disabled: boolean
  }> = []
  const queryString = search.startsWith("?") ? search.slice(1) : search
  const pairs = queryString.split("&")

  for (const pair of pairs) {
    const [key, value = ""] = pair.split("=")
    if (key) {
      params.push({
        key: decodeURIComponent(key),
        value: decodeURIComponent(value),
        type: "text",
        disabled: false,
      })
    }
  }

  return params
}
