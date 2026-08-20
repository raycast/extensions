import { findSite } from "./helpers";
import { findValidUrlsFromSite } from "../lib/url";

type Input = {
  /**
   * Name of the site, as shown in Forge (for example "example.com").
   */
  site: string;
};

export default async function tool({ site }: Input) {
  const { site: found } = await findSite(site);
  const urls = findValidUrlsFromSite(found);
  try {
    const res = await Promise.any(urls.map((url) => fetch(`http://${url}`, { method: "HEAD" })));
    return { site: found.name, online: res.status < 400, status: res.status, url: res.url };
  } catch {
    return { site: found.name, online: false, checked: urls };
  }
}
