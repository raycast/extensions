import { getPreferenceValues } from "@raycast/api";
import { load } from "cheerio";
import { XMLParser } from "fast-xml-parser";
import got from "got";
import TurndownService from "turndown";
import { newsFeedUrlDict } from "./constants.js";
import { NewsType, UnDocument, UnPress, UnNews } from "./types.js";

export const fetchUnDocuments = async () => {
  const xml = await got("https://undocs.org/rss/gadocs.xml").text();
  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });
  const documents = xmlParser.parse(xml);
  // @ts-expect-error: Expected any usage
  return documents.rss.channel.item.map((x) => ({
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
  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });
  const news = xmlParser.parse(xml);
  // @ts-expect-error: Expected any usage
  return news.rss.channel.item.map((x) => ({
    title: x.title,
    description: x.description,
    link: x.guid["#text"],
    pubDate: x.pubDate,
    image: x.enclosure.url,
    source: x.source["#text"],
  })) as UnNews[];
};

export const fetchUnPress = async () => {
  const xml = await got("https://press.un.org/en/rss.xml").text();
  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });
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
    .replace(/&nbsp/g, "");
  const turndownService = new TurndownService();
  const markdownContent = turndownService.turndown(htmlContent || "");
  return { markdownContent, textContent };
};

export const fetchUnNewsDetail = async (link: string) => {
  return fetchDetail(link, ".field--type-text-long");
};

export const fetchUnPressDetail = async (link: string) => {
  return fetchDetail(link, ".block-field-block-node-press-body");
};
