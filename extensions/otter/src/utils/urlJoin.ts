type UrlJoinOptions = {
  query?: Record<string, string>
}

// Like encodeURIComponent, but also encodes !'()* (RFC 3986 reserved).
const strictEncode = (value: string) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )

/**
 * Joins a base URL with path segments, collapsing duplicate slashes between
 * them, and appends an optional query string.
 */
export function urlJoin(
  base: string,
  ...parts: Array<string | number | UrlJoinOptions>
): string {
  const last = parts[parts.length - 1]
  const options =
    typeof last === 'object' ? (parts.pop() as UrlJoinOptions) : undefined

  const segments = (parts as Array<string | number>)
    .map((part) => String(part).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)

  let url = [base.replace(/\/+$/, ''), ...segments].join('/')

  if (options?.query) {
    const queryString = Object.entries(options.query)
      .map(([key, value]) => `${strictEncode(key)}=${strictEncode(value)}`)
      .join('&')
    if (queryString) {
      url += `?${queryString}`
    }
  }

  return url
}
