import { isAfter, subHours } from "date-fns";
import queryString from "query-string";
import fetch from "node-fetch";
import { genDigest } from "../digest";
import { PROVIDERS_MAP } from "../providers";
import { Digest, DigestStage, RSSItem, RawFeed, Source } from "../types";
import { normalizePreference } from "./preference";
import { isToday, withTimeout } from "./util";
import { NO_FEEDS } from "./error";
import dayjs from "dayjs";
import { addOrUpdateDigest, getComeFrom, getInterest, getSources } from "../store";
import { HttpsProxyAgent } from "https-proxy-agent";
import { RequestOptions } from "http";
import Parser from "rss-parser";

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
  return `Translate the following content into ${lang}, preserving the original line format and order.`;
}

function parseOutput(output: string): string[] {
  // 将输出按行分割成数组
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  // 目标行
  const targetLines = lines
    // .filter((line) => line.match(/^\d+\s*?\./))
    .map((line) => line.replace(/^\d+\s*?\./, ""));

  return targetLines;
}

export async function bizGenDigest(
  type: "manual" | "auto" = "auto",
  onProgress?: (stage: DigestStage, err?: Error) => void,
): Promise<Digest> {
  const preferences = normalizePreference();
  const {
    preferredLanguage,
    apiHost,
    apiKey,
    apiModel,
    maxTokens,
    summarizePrompt,
    httpProxy,
    enableItemLinkProxy,
    maxApiConcurrency,
    retryCount,
    retryDelay,
    requestTimeout,
    maxItemsPerFeed,
  } = preferences;
  const Provider = PROVIDERS_MAP[preferences.provider];

  const provider = new Provider({
    apiHost,
    apiKey,
    apiModel,
    maxTokens,
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
  const tidyreadCloudAvailable = await withTimeout(fetch("https://www.tidyread.info/read"), 20 * 1000)
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
    retryCount,
    retryDelay,
    requestTimeout,
    translateTitles: !preferredLanguage
      ? undefined
      : async (titles) => {
          const translatedTitles = await withTimeout(
            provider.translate(titles.join("\n"), preferredLanguage),
            // OpenAI需要的最长时间，比如30条内容会接近30秒
            60000,
          );
          console.log("raw translated titles:", translatedTitles);
          return parseOutput(translatedTitles);
        },
    itemLinkFormat: (link, item) => {
      if (!tidyreadCloudAvailable || !enableItemLinkProxy) return addUtmSourceToUrl(link);
      const qstr = queryString.stringify({
        source_link: addUtmSourceToUrl(link),
        rss_link: item?.feed?.url,
        status: item?.status,
        interest,
        come_from: comeFrom,
      });
      return `https://tidyread.info/read?${qstr}`;
    },
    onProgress,
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

export function addUtmSourceToUrl(url: string): string {
  // 解析当前URL的查询参数
  const parsedQuery = queryString.parseUrl(url);

  // 添加或更新utm_source参数
  parsedQuery.query["utm_source"] = "tidyread";

  // 重新构建URL
  return queryString.stringifyUrl(parsedQuery);
}

const parser = new Parser({
  requestOptions: {
    agent: createAgent(),
    timeout: normalizePreference().requestTimeout ?? 30 * 1000,
  },
});

export function parseRSS(url: string): Promise<RawFeed> {
  return parser.parseURL(url) as Promise<RawFeed>;
}
