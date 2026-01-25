import { RequestType, HeaderType } from "../types"

/**
 * Generates a cURL command string from a Postman request
 */
export const generateCurl = (request: RequestType): string => {
  const method = request.method || "GET"
  const url = request.url?.raw || ""

  if (!url) {
    return ""
  }

  let curl = `curl -X ${method}`

  // Add headers
  if (request.header && request.header.length > 0) {
    request.header
      .filter((h: HeaderType) => !h.disabled && h.key && h.value)
      .forEach((h: HeaderType) => {
        curl += ` -H "${h.key}: ${h.value}"`
      })
  }

  // Add body
  if (request.body) {
    const body = request.body
    if (body.mode === "raw" && body.raw) {
      // Escape single quotes and newlines for shell
      const escapedBody = body.raw.replace(/'/g, "'\\''").replace(/\n/g, "\\n")
      curl += ` -d '${escapedBody}'`
    } else if (body.mode === "urlencoded" && body.urlencoded) {
      const params = body.urlencoded
        .filter((p) => !p.disabled && p.key)
        .map(
          (p) =>
            `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value || "")}`
        )
        .join("&")
      if (params) {
        curl += ` -d "${params}"`
      }
    } else if (body.mode === "formdata" && body.formdata) {
      // For form-data, use -F flag
      body.formdata
        .filter((f) => !f.disabled && f.key)
        .forEach((f) => {
          curl += ` -F "${f.key}=${f.value || ""}"`
        })
    }
  }

  // Add URL (should be last)
  curl += ` "${url}"`

  return curl
}
