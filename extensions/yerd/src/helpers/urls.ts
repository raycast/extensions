import type { YerdSite, YerdStatusReport } from "../yerd/types";

/**
 * Build the URL for a Yerd site.
 *
 * Rules (in order):
 * 1. If `resolver_installed` is false → localhost fallback:
 *    `http://localhost:<http.bound>/~<name>.<tld>`
 * 2. Otherwise:
 *    - scheme = secure ? "https" : "http"
 *    - host   = `<name>.<tld>` (TLD always comes from the status report)
 *    - port   = bound port for that scheme; omitted when it matches the
 *      scheme's default. Default-port elision is delegated to the WHATWG
 *      URL port setter, so no port numbers are hardcoded here.
 */
export function siteUrl(site: YerdSite, report: YerdStatusReport): string {
  if (!report.resolver_installed) {
    return `http://localhost:${report.http.bound}/~${site.name}.${report.tld}`;
  }
  const scheme = site.secure ? "https" : "http";
  const binding = site.secure ? report.https : report.http;
  const url = new URL(`${scheme}://${site.name}.${report.tld}`);
  url.port = String(binding.bound);
  return url.origin;
}
