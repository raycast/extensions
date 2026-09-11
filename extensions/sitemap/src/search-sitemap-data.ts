import { getUrlOrCurrentTab } from "./get-url-or-current-tab";
import { sitemapLoader, type SitemapEntry } from "./sitemap";

export async function searchSitemap(urlArgument: string | undefined): Promise<readonly SitemapEntry[]> {
  const source = await getUrlOrCurrentTab(urlArgument);
  if (source.kind === "missing") throw new Error(source.reason);
  return sitemapLoader.load(source.websiteUrl);
}
