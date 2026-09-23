import { siteRecord } from "../lib/records";
import { findValidUrlsFromSite } from "../lib/url";

type Input = {
  /**
   * A site id from list-sites, for example 2882133.
   */
  siteId: number;
};

export default async function tool({ siteId }: Input) {
  const { site } = await siteRecord(siteId);
  const urls = findValidUrlsFromSite(site);
  try {
    const res = await Promise.any(urls.map((url) => fetch(`http://${url}`, { method: "HEAD" })));
    return { site: site.name, online: res.status < 400, status: res.status, url: res.url };
  } catch {
    return { site: site.name, online: false, checked: urls, note: "Nothing answered on HTTP for any of these." };
  }
}
