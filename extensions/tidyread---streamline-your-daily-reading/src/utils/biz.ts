import { isAfter, subHours } from "date-fns";
import { RSSItem, genDigest } from "../digest";
import { PROVIDERS_MAP } from "../providers";
import { Digest, Source } from "../types";
import { normalizePreference } from "./preference";
import { isToday } from "./util";
import { NO_FEEDS } from "./error";
import dayjs from "dayjs";
import { addOrUpdateDigest, getSources } from "../store";
import { HttpsProxyAgent } from "https-proxy-agent";
import { RequestOptions } from "http";
import { request } from "./request";

export const categorizeReadItems = (items: Source[]): { todayItems: Source[]; otherItems: Source[] } => {
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

export async function bizGenDigest(type: "manual" | "auto" = "auto"): Promise<Digest> {
  const preferences = normalizePreference();
  const {
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
    summarizePrompt,
  });

  const sources = await getSources();
  const { todayItems } = categorizeReadItems(sources);

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

  // 主要逻辑
  const digest = await genDigest({
    title: digestTitle,
    provider,
    rssFeeds: feeds,
    httpProxy,
    maxApiConcurrency,
    requestTimeout,
    itemLinkFormat: (link, item) => {
      if (!tidyreadCloudAvailable || !enableItemLinkProxy) return link;
      return `https://tidyread.info/read?source_link=${encodeURIComponent(link)}&rss_link=${encodeURIComponent(
        item?.feed?.url ?? "",
      )}`;
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

// e.g.: 9am, 10pm, 10:00, 10:05am, 23:12
export function isValidNotificationTime(time: string): boolean {
  // Regular expression to match both 24-hour and 12-hour time formats
  const timeFormatRegex =
    /^([01]?[0-9]|2[0-3]):([0-5][0-9])$|^(1[0-2]|0?[1-9]):([0-5][0-9])([ap]m)$|^(1[0-2]|0?[1-9])([ap]m)$/;
  return timeFormatRegex.test(time);
}
