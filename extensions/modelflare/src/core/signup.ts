import { SITE_URL } from './config.js'

const UTM_SOURCE_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/u

/**
 * Sign-up link carrying the plugin's acquisition source. Registration keeps
 * the last non-direct source for 90 days.
 */
export function signUpUrl(utmSource: string): string {
  if (!UTM_SOURCE_PATTERN.test(utmSource)) {
    throw new TypeError(`Invalid utm_source "${utmSource}": use lowercase letters, digits, ".", "_" or "-"`)
  }
  const url = new URL('/sign-up', SITE_URL)
  url.searchParams.set('utm_source', utmSource)
  url.searchParams.set('utm_medium', 'plugin')
  url.searchParams.set('utm_campaign', 'integrations')
  return url.toString()
}
