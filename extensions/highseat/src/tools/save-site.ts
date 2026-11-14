import { Tool } from "@raycast/api"
import { withAccessToken } from "@raycast/utils"
import { getChangeInfo } from "../lib/confirmation"
import { highseat, request } from "../lib/highseat"

type Input = {
  /** The site's name, as the dashboard shows it. */
  name?: string
  /** The site's hostname, subdomains included. A domain another site of the workspace holds answers 409 DOMAIN_TAKEN. */
  domain?: string
  /** IANA timezone every day boundary falls in, such as Europe/Warsaw. */
  timezone?: string
  /** ISO 4217 code every amount is reported in. Default USD. */
  reportingCurrency?: string
  /** The site's domain as registered, or its id. */
  site?: string
  /** Which pageview before a sale takes its credit in revenue split by page, source or campaign: the last, the first, or every one equally (`linear`). Applied when a report runs, so a change re-credits every past sale. */
  attributionModel?: "last" | "first" | "linear"
  /** Days before a sale a pageview may lie and still earn credit: 7, 14, 30 or 90. Applied when a report runs, so a change re-credits every past sale. */
  attributionLookback?: number
  /** Paths attribution never credits as a touch, `*` wildcards allowed: the page a checkout returns to. Applied when a report runs, so a change re-credits every past sale. */
  thankYouPaths?: string[]
  /** IP addresses and CIDR ranges whose events ingest drops. No visitor IP is stored, so a change reaches new events only. */
  excludedIps?: string[]
  /** Paths whose events ingest drops, `*` wildcards allowed. A change reaches new events only. */
  excludedPaths?: string[]
  /** Hostnames ingest counts besides the domain and its subdomains: an exact name, or `*.example.com` for that domain and its subdomains. A change reaches new events only. */
  extraHostnames?: string[]
}

export default withAccessToken(highseat)(async ({ site, ...body }: Input) => {
  if (site) return request("patch", "/sites/{site}", { path: { site }, body })
  return request("post", "/sites", { body })
})

export const confirmation: Tool.Confirmation<Input> = async ({ site, ...changes }) => ({
  message: site ? `Change the settings of ${site}?` : `Add the site ${changes.domain}?`,
  info: getChangeInfo(changes),
})
