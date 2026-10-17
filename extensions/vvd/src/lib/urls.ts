/**
 * Every URL the extension hands to the browser or the API, in one place — the
 * same shapes the web app builds (`/worlds/<slug>` is a world, `/editor?doc=`
 * focuses a document in the editor lens, `/api/v1` is the platform API).
 * Pure: no Raycast imports, unit-tested with node --test.
 */

export const DEFAULT_ORIGIN = "https://vvd.world"

/** A preference value is free text: trim it, strip a trailing slash, fall back. */
export function normalizeOrigin(raw: string | undefined | null): string {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "")
  if (!trimmed) return DEFAULT_ORIGIN
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`
  return trimmed
}

export function worldUrl(origin: string, slug: string): string {
  return `${origin}/worlds/${encodeURIComponent(slug)}`
}

/** The editor lens with the document focused — what a mention email links to. */
export function documentUrl(
  origin: string,
  slug: string,
  documentId: string,
): string {
  return `${worldUrl(origin, slug)}/editor?doc=${encodeURIComponent(documentId)}`
}

export function apiKeysUrl(origin: string): string {
  return `${origin}/settings/api-keys`
}

export function pricingUrl(origin: string): string {
  return `${origin}/pricing`
}

export type Query = Record<string, string | number | boolean | undefined>

/** `/api/v1` + path + a query string (undefined values are left out). */
export function apiUrl(origin: string, path: string, query?: Query): string {
  const url = `${origin}/api/v1${path.startsWith("/") ? path : `/${path}`}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}
