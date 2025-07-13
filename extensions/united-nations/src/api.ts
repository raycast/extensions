import { getPreferenceValues } from "@raycast/api";
import { load } from "cheerio/slim";
import { XMLParser } from "fast-xml-parser";
import got from "got";
import TurndownService from "turndown";
import { newsFeedUrlDict } from "./constants.js";
import { NewsType, SiteIndex, UnDocument, UnPhoto, UnPress, UnNews, LanguageCode, RssResponse } from "./types.js";
import { arrayifyRssItem, stripSpecialEscapedCharacters } from "./utils.js";

export const fetchUnDocuments = async () => {
  const [ga, sc, hrc, esc] = await Promise.all([
    got("https://esubscription.un.org/rss/gadocs.xml").text(),
    got("https://esubscription.un.org/rss/scdocs.xml").text(),
    got("https://esubscription.un.org/rss/hrc.xml").text(),
    got("https://esubscription.un.org/rss/ecosocdocs.xml").text(),
  ]);

  const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
  const gaDocs = xmlParser.parse(ga) as RssResponse;
  const scDocs = xmlParser.parse(sc) as RssResponse;
  const hrcDocs = xmlParser.parse(hrc) as RssResponse;
  const escDocs = xmlParser.parse(esc) as RssResponse;

  const allItems = [
    ...arrayifyRssItem(gaDocs.rss.channel.item),
    ...arrayifyRssItem(scDocs.rss.channel.item),
    ...arrayifyRssItem(hrcDocs.rss.channel.item),
    ...arrayifyRssItem(escDocs.rss.channel.item),
  ];

  return allItems.map((x) => ({
    title: x.title,
    description: x.description,
    link: x.link,
    pubDate: x.pubDate,
  })) as UnDocument[];
};

export const fetchUnNews = async (newsType: NewsType) => {
  const { newsLanguageCode } = getPreferenceValues<Preferences>();
  const xml = await got(
    `https://news.un.org/feed/subscribe/${newsLanguageCode}/news/${newsFeedUrlDict[newsType]}/rss.xml`,
  ).text();
  const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
  const news = xmlParser.parse(xml);
  // @ts-expect-error: Expected any usage
  return news.rss.channel.item.map((x) => ({
    title: x.title,
    description: x.description,
    link: x.guid["#text"],
    pubDate: x.pubDate,
    image: x?.enclosure?.url,
    source: x.source["#text"],
  })) as UnNews[];
};

export const fetchUnPress = async () => {
  const xml = await got("https://press.un.org/en/rss.xml").text();
  const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
  const press = xmlParser.parse(xml);
  // @ts-expect-error: Expected any usage
  return press.rss.channel.item.map((x) => ({
    title: x.title,
    description: x.description,
    link: x.guid["#text"],
    pubDate: x.pubDate,
    creator: x["dc:creator"],
  })) as UnPress[];
};

export const fetchDetail = async (link: string, selector: string) => {
  const html = await got(link).text();
  const $ = load(html);
  $("style").remove();
  $("script").remove();
  $(".media").remove();
  $(".type-twitter").remove();
  const htmlContent = $(selector)
    .html()
    ?.replace(/<h2>/g, "<h3>")
    .replace(/<\/h2>/g, "</h3>");
  const textContent = $(["p", "h2", "h3", "li"].map((tag) => `${selector} ${tag}`).join(","))
    .get()
    .map((el) => $(el).text())
    .join("\n")
    .replace(/&nbsp;/g, "");
  const turndownService = new TurndownService();
  const markdownContent = stripSpecialEscapedCharacters(turndownService.turndown(htmlContent || ""));
  return { markdownContent, textContent };
};

export const fetchUnNewsDetail = async (link: string) => {
  return fetchDetail(link, ".field--type-text-long");
};

export const fetchUnPressDetail = async (link: string) => {
  return fetchDetail(link, ".block-field-block-node-press-body");
};

export const fetchSiteIndex = async (languageCode: LanguageCode) => {
  const html = await got(`https://www.un.org/${languageCode}/site-index`).text();
  const $ = load(html);
  $("style").remove();
  $("script").remove();
  $(".Site-Index-TopNav").remove();
  const siteIndex: SiteIndex = {};

  if (languageCode === "ar") {
    const selector = ".panel-collapse";
    const menu = $(selector + " ul li").get();
    let currentCategory = "";
    for (const el of menu) {
      const element = $(el);
      if (element.text().at(0) !== currentCategory) {
        currentCategory = element.text().trim().at(0) as string;
        siteIndex[currentCategory] = [];
      }
      const title = element.text().trim();
      const link = element.find("a").attr("href") as string;
      if (title && link) siteIndex[currentCategory].push({ title, link });
      siteIndex[currentCategory].push();
    }
    return siteIndex;
  }

  const selector = ".field-type-text-with-summary .field-items";
  const menu = $(["h2", "ul li"].map((tag) => `${selector} ${tag}`).join(",")).get();
  let currentCategory = "";
  for (const el of menu) {
    const element = $(el);
    // @ts-expect-error: The element has `tagName` property
    if (el.tagName === "h2") {
      currentCategory = element.text().trim();
      siteIndex[currentCategory] = [];
    } else {
      const title = element.text().trim();
      const link = element.find("a").attr("href") as string;
      if (title && link) siteIndex[currentCategory].push({ title, link });
    }
  }
  return siteIndex;
};

export const fetchUnPhotos = async (page: number) => {
  const html = await got(
    `https://media.un.org/photo/en/latest-photos?${new URLSearchParams({ page: String(page) }).toString()}`,
  ).text();
  const $ = load(html);
  $("style").remove();
  $("script").remove();
  const gallery = $(".view-content .media-asset");
  const photos: UnPhoto[] = [];
  gallery.each((_, el) => {
    const card = $(el);
    const thumbImage = card.find("img").attr("src") as string;
    const sourceImage = card.find(".ajax-popup-link").attr("data-mfp-src") as string;
    const pageUrl = card.find(".ajax-popup-link").attr("href") as string;
    const title = card.find(".h5").text();
    const datetime = card.find("time").text();
    if (thumbImage && sourceImage && pageUrl && title && datetime) {
      photos.push({ thumbImage, sourceImage, pageUrl: "https://media.un.org" + pageUrl, title, datetime });
    }
  });
  return photos;
};
