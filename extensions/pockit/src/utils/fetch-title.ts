import axios from "axios";
import * as cheerio from "cheerio";
import { getGoogleFaviconUrl } from "./fetch-favicon";

export async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Try multiple methods to get the best title
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").text().trim() ||
      "";

    return title.length > 0 ? title : null;
  } catch (error) {
    console.error("Error fetching page title:", error);
    return null;
  }
}

export async function fetchPageMetadata(url: string) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const favicon = getGoogleFaviconUrl(url);

    return {
      title:
        $('meta[property="og:title"]').attr("content") ||
        $('meta[name="twitter:title"]').attr("content") ||
        $("title").text() ||
        null,
      description:
        $('meta[property="og:description"]').attr("content") ||
        $('meta[name="description"]').attr("content") ||
        $('meta[name="twitter:description"]').attr("content") ||
        null,
      image: $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content") || null,
      favicon:
        favicon || $('link[rel="icon"]').attr("href") || $('link[rel="shortcut icon"]').attr("href") || "/favicon.ico",
    };
  } catch (error) {
    console.error("Error fetching page metadata:", error);
    return null;
  }
}
