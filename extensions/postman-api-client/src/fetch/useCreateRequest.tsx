import { commonPreferences } from "../utils"
import fetch from "node-fetch"
import { RequestType, URLType, RequestDetailsType } from "../types"
import { buildCompleteUrl } from "../utils/urlBuilder"

export const createRequest = async (
  collectionId: string,
  name: string,
  request: RequestType
): Promise<{ success: boolean; error?: string; requestId?: string }> => {
  const accessToken = commonPreferences().accessToken

  try {
    // First, fetch the current collection to get its structure
    const getCollectionUrl = `https://api.getpostman.com/collections/${collectionId}`
    const getResponse = await fetch(getCollectionUrl, {
      method: "GET",
      headers: {
        "X-Api-Key": accessToken,
      },
    })

    if (!getResponse.ok) {
      const errorText = await getResponse.text()
      return {
        success: false,
        error: `Failed to fetch collection: ${getResponse.status} ${errorText}`,
      }
    }

    const collectionData = (await getResponse.json()) as {
      collection?: unknown
      [key: string]: unknown
    }
    // The API returns { collection: {...} }, so we need the collection object
    const collection = (collectionData.collection || collectionData) as {
      item?: RequestDetailsType[]
      info?: { name?: string; schema?: string }
      name?: string
      variable?: unknown[]
      auth?: unknown
      event?: unknown
    }

    // Ensure collection has the proper structure
    if (!collection) {
      return {
        success: false,
        error: "Invalid collection structure returned from API",
      }
    }

    // Ensure request URL has all required fields matching Postman API format exactly
    const requestToSend = { ...request }

    // Ensure URL object is properly structured matching Postman schema
    if (requestToSend.url) {
      const completeUrl = buildCompleteUrl(requestToSend.url)

      // If raw exists but components are missing, parse raw to fill components
      if (completeUrl.raw && (!completeUrl.protocol || !completeUrl.host)) {
        try {
          const urlObj = new URL(completeUrl.raw)
          completeUrl.protocol = urlObj.protocol.replace(":", "") as "https" | "http"
          completeUrl.host = urlObj.hostname.split(".")
          completeUrl.path = urlObj.pathname.split("/").filter((p) => p)

          if (urlObj.search) {
            completeUrl.query = Array.from(urlObj.searchParams.entries()).map(([key, value]) => ({
              key,
              value,
              type: "text",
              disabled: false,
            }))
          }
        } catch (e) {
          // If parsing fails, at least ensure we have raw
          console.error("Failed to parse URL components:", e)
        }
      }

      // Ensure all required fields are present and properly formatted
      if (!completeUrl.raw) {
        return {
          success: false,
          error: "Request URL is missing or invalid. The URL must have a 'raw' field.",
        }
      }

      if (!completeUrl.protocol) {
        return {
          success: false,
          error: "Request URL is missing protocol (http/https).",
        }
      }

      if (!completeUrl.host || completeUrl.host.length === 0) {
        return {
          success: false,
          error: "Request URL is missing host.",
        }
      }

      // Ensure path is an array (can be empty)
      if (!completeUrl.path) {
        completeUrl.path = []
      }

      // Build URL matching Postman API format exactly
      const cleanUrl: URLType = {
        raw: completeUrl.raw,
        protocol: completeUrl.protocol,
        host: completeUrl.host,
        path: completeUrl.path || [],
      }

      // Only add query if it exists and has items - format: [{key, value}] not [{key, value, type, disabled}]
      if (completeUrl.query && completeUrl.query.length > 0) {
        const activeParams = completeUrl.query.filter((q) => !q.disabled && q.value)
        if (activeParams.length > 0) {
          cleanUrl.query = activeParams.map((q) => ({
            key: q.key,
            value: q.value || "",
            type: q.type || "text",
            disabled: q.disabled || false,
          }))
        }
      }

      requestToSend.url = cleanUrl
    } else {
      return {
        success: false,
        error: "Request URL is required",
      }
    }

    // Ensure headers are properly formatted - Postman API expects [{key, value}]
    let headersArray: Array<{ key: string; value: string; type: string }> = []
    if (requestToSend.header) {
      headersArray = requestToSend.header
        .filter((h) => h.key && h.value && !h.disabled)
        .map((h) => ({
          key: h.key,
          value: h.value,
          type: h.type || "text",
        }))
    }

    // Build the new request item matching Postman API format exactly
    const newRequestItem: RequestDetailsType = {
      id: "",
      name,
      request: {
        method: requestToSend.method || "GET",
        url: requestToSend.url,
      },
      response: [],
    }

    // Add headers if present (only if array has items)
    if (headersArray.length > 0) {
      newRequestItem.request.header = headersArray
    }

    // Add body if present
    if (requestToSend.body) {
      newRequestItem.request.body = requestToSend.body
    }

    // Add the new request to the collection's item array
    // Ensure item array exists
    if (!collection.item) {
      collection.item = []
    }

    // Append the new request to the existing items (don't replace)
    collection.item.push(newRequestItem)

    // Ensure collection has info object (required by Postman API)
    if (!collection.info) {
      collection.info = {
        name: collection.name || "Collection",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      }
    }

    // Update the collection with the new request added
    // Send the entire collection object matching Postman API format exactly
    // This matches the working example: PUT /collections/:uid with full collection JSON
    const updateUrl = `https://api.getpostman.com/collections/${collectionId}`
    const updatePayload = {
      collection: {
        info: collection.info,
        item: collection.item, // All items including the new one
        // Preserve other collection properties if they exist
        variable: collection.variable || [],
        auth: collection.auth,
        event: collection.event,
      },
    }

    const updateResponse = await fetch(updateUrl, {
      method: "PUT",
      headers: {
        "X-Api-Key": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatePayload),
    })

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      return {
        success: false,
        error: `Failed to update collection: ${updateResponse.status} ${errorText}`,
      }
    }

    const result = (await updateResponse.json()) as {
      collection?: { item?: RequestDetailsType[] }
    }
    // Find the newly added request in the response
    const addedRequest = result.collection?.item?.find((item: RequestDetailsType) => item.name === name)

    return {
      success: true,
      requestId: addedRequest?.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
