import { isAfter, subHours } from "date-fns";
import queryString from "query-string";
import { RSSItem, genDigest } from "../digest";
import { PROVIDERS_MAP } from "../providers";
import { Digest, Source } from "../types";
import { normalizePreference } from "./preference";
import { isToday, withTimeout } from "./util";
import { NO_FEEDS } from "./error";
import dayjs from "dayjs";
import { addOrUpdateDigest, getComeFrom, getInterest, getSources } from "../store";
import { HttpsProxyAgent } from "https-proxy-agent";
import { RequestOptions } from "http";
import { request } from "./request";

export const categorizeSources = (items: Source[]): { todayItems: Source[]; otherItems: Source[] } => {
  const today = new Date();

  const todayItems = items.filter(
    (item) =>
      item.schedule === "everyday" ||
      (item.schedule === "custom" && item.customDays?.some((day) => isToday(today, day))),
  );

  const otherItems = items.filter((item) => !todayItems.includes(item));

  return { todayItems, otherItems };
};

export function createAgent(): RequestOptions["agent"] | undefined {
  const httpProxy = normalizePreference().httpProxy;
  return httpProxy ? new HttpsProxyAgent(httpProxy) : undefined;
}

function getTranslateTitlesPrompt(lang: string) {
  return `
  ## Target
  Translate each title in the array.

  ## Example
  Input:
  ['Title 1', 'Title 2', 'Title 3', ...]

  Output:
  1.Title 1
  2.Title 2
  3.Title 3
  ...

  ## Requirements
  1. Directly output the translated titles, without any other content.
  2. Each output title must be translated into language: ${lang}
  3. Maintain the original order.
  4. Each title should start on a new line, separated by a blank line, rather than any other separators.
  5. Each title is prefixed with a serial number.
  `;
}

function parseOutput(output: string): string[] {
  // 将输出按行分割成数组
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  // 目标行
  const targetLines = lines.filter((line) => line.match(/^\d+\s*?\./)).map((line) => line.replace(/^\d+\s*?\./, ""));

  return targetLines;
}

export async function bizGenDigest(type: "manual" | "auto" = "auto"): Promise<Digest> {
  const preferences = normalizePreference();
  const {
    preferredLanguage,
    apiHost,
    apiKey,
    apiModel,
    summarizePrompt,
    httpProxy,
    enableItemLinkProxy,
    maxApiConcurrency,
    requestTimeout,
    maxItemsPerFeed,
  } = preferences;
  const Provider = PROVIDERS_MAP[preferences.provider];

  const provider = new Provider({
    apiHost,
    apiKey,
    apiModel,
    httpProxy,
    summarizePrompt: summarizePrompt.replaceAll("{{lang}}", preferredLanguage || "language of the content"),
    translatePrompt: getTranslateTitlesPrompt(preferredLanguage || "language of the content"),
  });

  const sources = await getSources();
  const { todayItems } = categorizeSources(sources);

  const feeds = todayItems
    .filter((item) => !!item.rssLink)
    .map((readItem) => ({
      title: readItem.title,
      url: readItem.rssLink!,
      filter: (item: RSSItem) => {
        const itemDate = item.pubDate ? new Date(item.pubDate) : new Date();
        const timeThreshold = subHours(new Date(), +readItem.timeSpan! * 24);
        return isAfter(itemDate, timeThreshold);
      },
      maxItems: maxItemsPerFeed,
    }));

  if (feeds.length === 0) {
    throw new Error(NO_FEEDS);
  }

  const digestTitle = `${dayjs().format("YYYY-MM-DD")} Digest`;

  // 判断tidyread是否可访问，如果不可访问，则使用原始链接
  const tidyreadCloudAvailable = await request("https://www.tidyread.info/read")
    .then(() => true)
    .catch(() => false);

  const interest = await getInterest();
  const comeFrom = await getComeFrom();

  // 主要逻辑
  const digest = await genDigest({
    title: digestTitle,
    provider,
    rssFeeds: feeds,
    httpProxy,
    maxApiConcurrency,
    requestTimeout,
    translateTitles: !preferredLanguage
      ? undefined
      : async (titles) => {
          const translatedTitles = await withTimeout(
            provider.translate(JSON.stringify(titles), preferredLanguage),
            requestTimeout,
          );
          console.log("raw translated titles:", translatedTitles);
          return parseOutput(translatedTitles);
        },
    itemLinkFormat: (link, item) => {
      if (!tidyreadCloudAvailable || !enableItemLinkProxy) return link;
      const qstr = queryString.stringify({
        source_link: link,
        rss_link: item?.feed?.url,
        status: item?.status,
        interest,
        come_from: comeFrom,
      });
      return `https://tidyread.info/read?${qstr}`;
    },
  });

  // 写入存储
  const finalDigest = await addOrUpdateDigest({
    ...digest,
    type,
    title: digestTitle,
  });

  console.log("digest content:", finalDigest.content);

  return finalDigest;
}

export async function translateContent(content: string, targetLang: string = "English"): Promise<string> {
  const preferences = normalizePreference();
  const { apiHost, apiKey, apiModel, httpProxy } = preferences;
  const Provider = PROVIDERS_MAP[preferences.provider];

  const provider = new Provider({
    apiHost,
    apiKey,
    apiModel,
    httpProxy,
  });

  const translatedContent = await provider.translate(content, targetLang);

  return translatedContent;
}

// e.g.: 9am, 10pm, 10:00, 10:05am, 23:12
export function isValidNotificationTime(time: string): boolean {
  // Regular expression to match both 24-hour and 12-hour time formats
  const timeFormatRegex =
    /^([01]?[0-9]|2[0-3]):([0-5][0-9])$|^(1[0-2]|0?[1-9]):([0-5][0-9])([ap]m)$|^(1[0-2]|0?[1-9])([ap]m)$/;
  return timeFormatRegex.test(time);
}
