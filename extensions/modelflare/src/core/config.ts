export const SITE_URL = 'https://modelflare.dev'
export const DOCS_URL = 'https://docs.modelflare.dev'
export const KEYS_URL = `${SITE_URL}/keys`
export const BILLING_URL = `${SITE_URL}/billing`
export const PRICING_URL = `${SITE_URL}/pricing`

// The China entry only admits /v1/* on direct connections, so the public
// catalog is always read from the global host.
export const CATALOG_URL = `${SITE_URL}/api/pricing`

export const BASE_URLS = {
  global: `${SITE_URL}/v1`,
  china: 'https://origin.modelflare.dev/v1',
} as const

export type Region = keyof typeof BASE_URLS

export const DEFAULT_REGION: Region = 'global'

function isRegion(value: string): value is Region {
  return Object.hasOwn(BASE_URLS, value)
}

/**
 * Resolves a region name or a custom base URL to the `/v1` base every request
 * path is appended to. A custom URL without a path gets `/v1`.
 */
export function resolveBaseUrl(input?: string): string {
  const value = input?.trim() ?? ''
  if (value === '') return BASE_URLS[DEFAULT_REGION]
  if (isRegion(value)) return BASE_URLS[value]

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new TypeError(`Invalid Modelflare base URL: ${value}`)
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new TypeError(`Invalid Modelflare base URL: ${value}`)
  }
  url.search = ''
  url.hash = ''
  const path = url.pathname.replace(/\/+$/u, '')
  url.pathname = path === '' ? '/v1' : path
  return url.toString().replace(/\/+$/u, '')
}
