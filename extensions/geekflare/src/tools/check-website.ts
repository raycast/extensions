import { callGeekflare, normalizeUrl, WEBSITE_CHECKS } from "../geekflare";

type Input = {
  /**
   * Website URL or domain, for example example.com.
   */
  url: string;
  /**
   * Which check to run. lighthouse is slow (a minute or more).
   */
  check: "site_status" | "dns_records" | "tls_scan" | "redirect_check" | "broken_links" | "load_time" | "lighthouse";
};

/**
 * @returns The Geekflare result for the chosen check.
 */
export default async function (input: Input) {
  const { path } = WEBSITE_CHECKS[input.check];
  const payload = await callGeekflare(path, { url: normalizeUrl(input.url) });
  return { check: input.check, result: JSON.stringify(payload.data ?? payload) };
}
