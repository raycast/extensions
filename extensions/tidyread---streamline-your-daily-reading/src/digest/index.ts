import Parser from "rss-parser";
import pLimit from "p-limit";
import { HttpsProxyAgent } from "https-proxy-agent";
import { load } from "cheerio";
import { isXML, normalizeUrlForMarkdown, retry, withTimeout } from "../utils/util";
import { DigestItem, Provider, SummarizeStatus } from "../types";
import dayjs from "dayjs";
import { uniqBy } from "lodash";
import { addUtmSourceToUrl } from "../utils/biz";
// import { fetchMetadata } from "../utils/request";

export interface Preferences {
  provider?: "openai";
  apiKey?: string;
  apiModel?: string;
  apiHost?: string;
  httpProxy?: string;
  summarizePrompt?: string;
  maxItemsPerFeed?: number;
  maxApiConcurrency?: number;
  notificationTime?: string;
  autoGenDigest?: boolean;
}

export interface RSSFeed {
  title: string;
  url: string;
  filter?: (item: RSSItem) => boolean;
  maxItems?: number;
}

export interface RSSItem {
  link?: string;
  title?: string;
  pubDate?: string | number;
  creator?: string;
  summary?: string;
  content?: string;
  coverImage?: string;
  feed?: RSSFeed;
  [k: string]: any;
}

export type RSSItemWithStatus = RSSItem & {
  status: SummarizeStatus;
};

const MIN_SUMMARIZE_CHARACTER_LIMIT = 100;
const THRESHOLDS_FOR_TRUNCATION = 200;

// 获取并过滤所有RSS items
async function getAllFilteredItems(
  rssFeeds: RSSFeed[],
  httpProxy?: string,
  requestTimeout?: number,
): Promise<RSSItem[]> {
  const agent = httpProxy ? new HttpsProxyAgent(httpProxy) : undefined;

  const parser = new Parser({
    requestOptions: {
      agent,
    },
  });
  let allItems: RSSItem[] = [];

  for (const feed of rssFeeds) {
    try {
      console.log("start to parse rss feed", feed.url);
      const resp = await withTimeout(parser.parseURL(feed.url), requestTimeout ?? 30 * 1000);

      const filteredItems = await Promise.all(
        // 需要对相同title去重，有些rss质量不高，会出现重复的title不同link
        uniqBy(resp.items.filter(feed.filter ?? (() => true)).slice(0, feed.maxItems ?? 10), "title").map(
          async (item) => ({
            ...item,
            feed,
            // 以下代码会增加执行时间，并且raycast展示空间有限，暂时不展示cover
            // coverImage: item.link ? (await fetchMetadata(item.link)).coverImageUrl : "",
          }),
        ),
      );

      // console.log(
      //   "coverimages:",
      //   filteredItems.map((item) => item.coverImage),
      // );

      console.log(`rss feed ${feed.url} parsed, ${filteredItems.length} items found`);

      allItems = allItems.concat(filteredItems);
    } catch (error: any) {
      console.error(`Failed to parse RSS feed ${feed.url}: ${error.message}`);
      throw error;
    }
  }

  return allItems;
}

function ellipsisContent(content: string, maxLen: number): string {
  if (content.length > maxLen) {
    return content.substring(0, maxLen) + "...";
  }
  return content;
}

// 对单个项目进行概述
async function summarizeItem(
  item: RSSItem,
  provider: Provider,
  requestTimeout?: number,
  retryCount?: number,
  retryDelay?: number,
): Promise<RSSItemWithStatus> {
  // console.log(`retry count: ${retryCount}, retry delay: ${retryDelay}`);
  try {
    const needSummarize = item.content && item.content.length > MIN_SUMMARIZE_CHARACTER_LIMIT && provider.available;
    const summary = needSummarize
      ? await retry(
          () => withTimeout(provider.summarize(item.content!), requestTimeout ?? 30 * 1000),
          retryCount ?? 5,
          retryDelay ?? 30 * 1000,
        )
      : ellipsisContent(item.content || "", THRESHOLDS_FOR_TRUNCATION);

    return { ...item, summary: summary, status: needSummarize ? "summraized" : "raw" };
  } catch (error: any) {
    console.error(`Failed to summarize: ${error.message}`);
    return {
      ...item,
      summary: `> **Fail to summarize**, error is: \`${error.message}\`. Raw content is below:\n\n${ellipsisContent(
        item.content || "",
        THRESHOLDS_FOR_TRUNCATION,
      )}`,
      status: "failedToSummarize",
    };
  }
}

// 生成摘要
function generateDigestTemplate(provider: Provider, items: RSSItemWithStatus[]): string {
  // const prefix = `# ${title}  \`at ${dayjs(time).format('HH:mm')}\`\n\n`;
  const prefix = provider.available
    ? ``
    : `> **Your AI Provider has not been configured correctly**. When it is configured, each item will be summarized by AI, otherwise it will only get the original excerpts.\n\n`;
  let digest = `${prefix}`;

  digest += `## Introduction\n[Tidyread](https://tidyread.info) generated a flat summary of the content from all the sources today. **Only sources that have a valid RSS Link** can be summarized.\nThe content pulled by rss will be filtered according to the \`Time Span\` you provide, keeping only the content in the time span.\n\n## Summary\n`;

  if (items.length === 0) {
    return `${digest}No RSS items remain after filtering.`;
  }

  for (const [index, item] of items.entries()) {
    digest += formatItemForDigest(item, `${index + 1}. `);
  }

  if (items.some((item) => item.status === "failedToSummarize")) {
    digest += `---\n\n## Why Some Articles Failed To Be Summarized By AI?\n\nYou can check out [this document](https://www.tidyread.info/docs/why-some-articles-fail-to-be-summarized) to understand why and how to fix it.\n\n`;
  }

  return digest;
}

// 格式化单个项目以用于摘要
function formatItemForDigest(item: RSSItemWithStatus, prefixStr?: string): string {
  return `### ${prefixStr ?? ""}${item.title}  @([${item?.feed?.title}](${addUtmSourceToUrl(
    item?.feed?.url ?? "",
  )}))\n${item.coverImage ? `![cover](${item.coverImage})\n\n` : ""}${
    item.summary || item.content?.substring(0, THRESHOLDS_FOR_TRUNCATION) + "..."
  }\n\n[Source Link](${normalizeUrlForMarkdown(item.link ?? "")})\n\n${
    item.status === "summraized" ? `\`AI Summarized\`  ` : ""
  }${["raw", "failedToSummarize"].includes(item.status) ? `\`Raw Content\`  ` : ""}\`Pub Time: ${dayjs(
    item.pubDate,
  ).format("YYYY-MM-DD HH:mm")}\`  \`Creator: ${item.creator ?? "none"}\`\n\n`;
}

function extractTextFromXML(xml: string): string {
  const $ = load(xml);
  // console.log("xml", xml);
  // 移除不需要的元素，如样式、脚本等
  $("script, style, noscript").remove();

  // 提取纯文本内容
  return $("body").text();
}

// 格式化RSS Items，对content进行判断，如果是xml，则提取其中text
async function formatRSSItems(items: RSSItem[]): Promise<RSSItem[]> {
  return Promise.all(
    items.map(async (item) => {
      const content = (item.content || "").replace("&lt;", "<").replace("&gt;", ">");

      if (isXML(content)) {
        try {
          const text = extractTextFromXML(content);
          console.log(`parsed text for \`${item.title}\`: ${text}`);
          item.content = text.trim();
        } catch (error: any) {
          console.error(`Failed to parse XML content: ${error.message}`);
        }
      }
      return item;
    }),
  );
}

export async function genDigest(options: {
  title: string;
  rssFeeds: RSSFeed[];
  httpProxy?: string;
  provider: Provider;
  translateTitles?: (titles: string[]) => Promise<string[]>;
  maxApiConcurrency?: number;
  requestTimeout?: number;
  retryCount?: number;
  retryDelay?: number;
  itemLinkFormat?: (link: string, item: RSSItem) => string;
}): Promise<{
  content: string;
  items: DigestItem[];
  createAt: number;
}> {
  const now = Date.now();
  console.time(`gen digest ${now}`);
  const limit = pLimit(options.maxApiConcurrency ?? 3);

  const rssFeeds = options.rssFeeds;

  // 第一步：获取并过滤所有RSS items
  const allFilteredItems = await getAllFilteredItems(rssFeeds, options.httpProxy, options.requestTimeout);

  // 第二步：格式化rss item
  let formatedItems = (await formatRSSItems(allFilteredItems)) as RSSItemWithStatus[];

  console.log(`${formatedItems.length} rss items found after filter`, formatedItems);

  // 第三步：翻译titles
  async function translateTitles() {
    if (options.translateTitles) {
      console.time("translate titles");
      try {
        const translatedTitles = await options.translateTitles(formatedItems.map((item) => item.title || ""));

        console.log("translated titles success:", translatedTitles);

        formatedItems.forEach((item, index) => {
          item.title = translatedTitles[index] ?? item.title;
        });
      } catch (err: any) {
        console.error("translate titles failed", err);
      } finally{
        console.timeEnd("translate titles");
      }
    }
  }

  // 第四步：并发地对items进行概述
  const [, ...summarizedItems] = await Promise.all([
    translateTitles(),
    ...formatedItems.map((item) =>
      limit(() =>
        summarizeItem(item, options.provider, options.requestTimeout, options.retryCount, options.retryDelay),
      ),
    ),
  ]);

  formatedItems = summarizedItems.map((item) => ({
    ...item,
    link: options.itemLinkFormat ? options.itemLinkFormat(item.link ?? "", item) : item.link,
  }));

  console.timeEnd(`gen digest ${now}`);

  // 第五步：生成并返回摘要
  return {
    content: generateDigestTemplate(options.provider, formatedItems),
    items: formatedItems.map((item) => ({
      status: item.status,
    })),
    createAt: Date.now(),
  };
}
