import * as cheerio from "cheerio";
import { SITEMAP_URL } from "../constants";

export async function fetchSitemap(sitemapUrl: string = SITEMAP_URL): Promise<string[]> {
  const response = await fetch(sitemapUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
  }
  const data = await response.text();
  const $ = cheerio.load(data, { xmlMode: true });
  const urls: string[] = [];

  $("url loc").each((_, element) => {
    urls.push($(element).text().trim());
  });

  return urls;
}
