import { URLType } from "../types"

/**
 * Reconstructs raw URL from Postman API response
 * Postman API might return URL without raw field, so we need to build it
 */
export const reconstructUrlFromPostman = (url: URLType | undefined): URLType | undefined => {
  if (!url) return undefined

  // If raw exists, ensure it's complete
  if (url.raw && url.raw.match(/^https?:\/\//i)) {
    return url
  }

  // Build raw from components if available
  if (url.protocol && url.host && url.host.length > 0) {
    const host = url.host.join(".")
    const path = url.path && url.path.length > 0 ? "/" + url.path.join("/") : ""

    let queryString = ""
    if (url.query && url.query.length > 0) {
      const activeParams = url.query.filter((q) => !q.disabled && q.value)
      if (activeParams.length > 0) {
        queryString =
          "?" + activeParams.map((q) => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value || "")}`).join("&")
      }
    }

    const rawUrl = `${url.protocol}://${host}${path}${queryString}`

    return {
      ...url,
      raw: rawUrl,
    }
  }

  // If we have raw but it's incomplete, try to fix it
  if (url.raw && !url.raw.match(/^https?:\/\//i)) {
    // Try to add protocol if missing
    const fixedRaw = url.raw.startsWith("//")
      ? `https:${url.raw}`
      : url.raw.includes("://")
      ? url.raw
      : `https://${url.raw}`
    return {
      ...url,
      raw: fixedRaw,
    }
  }

  return url
}

/**
 * Builds a complete URL object with raw field from URL components
 * Ensures the raw field is always set for Postman API compatibility
 */
export const buildCompleteUrl = (url: URLType): URLType => {
  // If raw is already set and complete, return as is
  if (url.raw && url.raw.match(/^https?:\/\//i)) {
    return url
  }

  // Build raw URL from components
  if (url.protocol && url.host && url.host.length > 0) {
    const host = url.host.join(".")
    const path = url.path && url.path.length > 0 ? "/" + url.path.join("/") : ""

    let queryString = ""
    if (url.query && url.query.length > 0) {
      const activeParams = url.query.filter((q) => !q.disabled && q.value)
      if (activeParams.length > 0) {
        queryString =
          "?" + activeParams.map((q) => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value || "")}`).join("&")
      }
    }

    const rawUrl = `${url.protocol}://${host}${path}${queryString}`

    return {
      ...url,
      raw: rawUrl,
    }
  }

  // If we can't build from components, try to use raw if available
  if (url.raw) {
    return url
  }

  // Last resort: return as is (will be validated later)
  return url
}

/**
 * Ensures a URL string is converted to a complete URLType object
 */
export const ensureCompleteUrl = (urlString: string): URLType => {
  try {
    const urlObj = new URL(urlString)
    const pathParts = urlObj.pathname.split("/").filter((p) => p)

    const queryParams = Array.from(urlObj.searchParams.entries()).map(([key, value]) => ({
      key,
      value,
      type: "text",
      disabled: false,
    }))

    return {
      raw: urlString,
      protocol: urlObj.protocol.replace(":", "") as "https" | "http",
      host: urlObj.hostname.split("."),
      path: pathParts,
      query: queryParams.length > 0 ? queryParams : undefined,
    }
  } catch (error) {
    // If URL parsing fails, return minimal structure with raw
    return {
      raw: urlString,
    }
  }
}
