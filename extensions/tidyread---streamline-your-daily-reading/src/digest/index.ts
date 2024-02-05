import Parser from "rss-parser";
import pLimit from "p-limit";
import { HttpsProxyAgent } from "https-proxy-agent";
import { load } from "cheerio";
import { isXML, normalizeUrlForMarkdown, retry, sleep, withTimeout } from "../utils/util";
import {
  DigestItem,
  DigestStage,
  Provider,
  PullItemsStage,
  RSSFeed,
  RSSItem,
  SummarizeItemStage,
  SummarizeStatus,
} from "../types";
import dayjs from "dayjs";
import { uniqBy } from "lodash";
import { addUtmSourceToUrl } from "../utils/biz";
import { CATEGORIES_EMOJI_MAP } from "../const";
// import { fetchMetadata } from "../utils/request";

export type RSSItemWithStatus = RSSItem & {
  status?: SummarizeStatus;
};

const MIN_SUMMARIZE_CHARACTER_LIMIT = 100;
const THRESHOLDS_FOR_TRUNCATION = 200;

// 获取并过滤所有RSS items
async function getAllFilteredItems(
  rssFeeds: RSSFeed[],
  httpProxy?: string,
  requestTimeout?: number,
  onProgress?: (stage: PullItemsStage, err?: Error) => void,
): Promise<RSSItem[]> {
  const agent = httpProxy ? new HttpsProxyAgent(httpProxy) : undefined;

  const parser = new Parser({
    headers: {
      // 否则有些服务会返回 406 错误码
      Accept: "application/rss+xml, application/xml, text/xml",
    },
    requestOptions: {
      agent,
      timeout: requestTimeout ?? 30 * 1000,
    },
  });
  let allItems: RSSItem[] = [];

  onProgress?.({
    stageName: "pull_items",
    status: "start",
    data: null,
  });

  for (const feed of rssFeeds) {
    try {
      console.log("start to parse rss feed", feed.url);
      const resp = await parser.parseURL(feed.url);

      // console.log(
      //   "rss feed parsed",
      //   resp.items.map((item) => [item.summary, item.content]),
      //   "items found",
      // );

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
      onProgress?.(
        {
          stageName: "pull_items",
          status: "failed",
          data: null,
        },
        error,
      );
      throw new Error(`Failed to parse RSS feed ${feed.url}: ${error.message}`);
    }
  }

  onProgress?.({
    stageName: "pull_items",
    status: "success",
    data: allItems.length,
  });

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
  onProgress?: (stage: SummarizeItemStage, err?: Error) => void,
): Promise<RSSItemWithStatus> {
  // console.log(`retry count: ${retryCount}, retry delay: ${retryDelay}`);
  const needContentBeSummarizedByAI =
    item.content && item.content.length > MIN_SUMMARIZE_CHARACTER_LIMIT && provider.available;

  // 是否原始的summary需要被AI概述
  const needRawSummaryBeSummarizedByAI =
    !item.content && !!item.summary && item.summary.length > MIN_SUMMARIZE_CHARACTER_LIMIT && provider.available;

  const needAISummarize = needContentBeSummarizedByAI || needRawSummaryBeSummarizedByAI;

  try {
    onProgress?.({
      stageName: "summarize_item",
      status: "start",
      data: item,
      type: needAISummarize ? "ai" : "raw",
    });

    const summary = needAISummarize
      ? await retry(
          () => withTimeout(provider.summarize(item.content || item.summary || ""), requestTimeout ?? 30 * 1000),
          retryCount ?? 5,
          retryDelay ?? 30 * 1000,
          (err) => {
            // moonshot会出现high risk的错误，这种错误不需要重试
            if (err.message.includes("high risk")) {
              return true;
            }

            return false;
          },
        )
      : // 不需要概述，优先使用summary
        ellipsisContent(item.summary || item.content || "", THRESHOLDS_FOR_TRUNCATION);

    onProgress?.({
      stageName: "summarize_item",
      status: "success",
      data: item,
      type: needAISummarize ? "ai" : "raw",
    });

    // 如果开新对象，外部并发的titles赋值会无效
    return Object.assign(item, {
      summary,
      status: needAISummarize ? ("summraized" as const) : ("raw" as const),
    });
  } catch (error: any) {
    console.error(`Failed to summarize: ${error.message}`);
    onProgress?.({
      stageName: "summarize_item",
      status: "failed",
      data: item,
      type: needAISummarize ? "ai" : "raw",
    });

    // 如果开新对象，外部并发的titles赋值会无效
    return Object.assign(item, {
      summary: `> ❗ **Failed to summarize**, error is: \`${error.message}\`. Raw ${
        item.summary ? "summary" : "content"
      } is below:\n\n${ellipsisContent(item.summary || item.content || "", THRESHOLDS_FOR_TRUNCATION)}`,
      status: "failedToSummarize" as const,
    });
  }
}

// 生成摘要
function generateDigestTemplate(
  provider: Provider,
  items: RSSItemWithStatus[],
  splitByTags?: boolean,
  ignoreIntroduction?: boolean,
): string {
  // const prefix = `# ${title}  \`at ${dayjs(time).format('HH:mm')}\`\n\n`;
  const prefix = provider.available
    ? ``
    : `> 💡 **Your AI Provider has not been configured correctly**. When it is configured, each item will be summarized by AI, otherwise it will only get the raw content. Check [the doc](https://www.tidyread.info/docs/empowered-with-ai) to learn how to config.\n\n`;
  let digest = `${prefix}`;

  if (!ignoreIntroduction) {
    digest += `## Introduction\nTidyread generated a flat summary of the content from all the sources today. **Only sources that have a valid [RSS](https://meganesulli.com/blog/how-rss-works/) Link** can be summarized. Check [the doc](https://www.tidyread.info/docs/where-to-find-rss) to know where to find RSS.\n\n---\n\n`;
  }

  if (items.length === 0) {
    return `${digest}No [RSS](https://meganesulli.com/blog/how-rss-works/) items remain after filtering.`;
  }

  const tagsItemsMap = new Map<string, RSSItemWithStatus[]>();

  if (splitByTags) {
    for (const item of items) {
      const tags = item.feed?.tags ?? [];

      if (tags.length === 0) {
        if (tagsItemsMap.has("Others")) {
          tagsItemsMap.get("Others")!.push(item);
        } else {
          tagsItemsMap.set("Others", [item]);
        }
        continue;
      }

      for (const tag of tags) {
        if (tagsItemsMap.has(tag)) {
          tagsItemsMap.get(tag)!.push(item);
        } else {
          tagsItemsMap.set(tag, [item]);
        }
      }
    }
  }

  const tagsMapLen = tagsItemsMap.size;
  const tagsMapHasOnlyOthers = tagsMapLen === 1 && tagsItemsMap.has("Others");

  if (splitByTags && !tagsMapHasOnlyOthers) {
    // Others始终在最后
    const sortedEntries = Array.from(tagsItemsMap.entries()).sort((a, b) => {
      if (a[0] === "Others") return 1;
      if (b[0] === "Others") return -1;
      // 如果两个标签都不是'Others'，保持它们的原始顺序（或按其他标准排序）
      return 0;
    });
    for (const [tag, items] of sortedEntries) {
      digest += `## ${CATEGORIES_EMOJI_MAP[tag] ?? "🏷️"} ${tag}\n\n`;

      for (const [index, item] of items.entries()) {
        digest += formatItemForDigest(item, `${index + 1}. `);
      }
    }
  } else {
    for (const [index, item] of items.entries()) {
      digest += formatItemForDigest(item, `${index + 1}. `);
    }
  }

  if (items.some((item) => item.status === "failedToSummarize")) {
    digest += `\n\n---\n\n### 🚧 Why Some Articles Failed To Be Summarized By AI?\n\nYou can check out [this document](https://www.tidyread.info/docs/why-some-articles-fail-to-be-summarized) to understand why and how to fix it.\n\n`;
  }

  return digest;
}

// 格式化单个项目以用于摘要
export function formatItemForDigest(item: RSSItemWithStatus, prefixStr?: string, ignoreFeed?: boolean): string {
  return `### ${prefixStr ?? ""}${item.title}  ${
    ignoreFeed ? "" : `@([${item?.feed?.title}](${addUtmSourceToUrl(item?.feed?.url ?? "")}))`
  }\n${item.coverImage ? `![cover](${item.coverImage})\n\n` : ""}${
    item.summary || addEllipsis(item.content || "", THRESHOLDS_FOR_TRUNCATION)
  }\n\n[Source Link](${normalizeUrlForMarkdown(item.link ?? "")})\n\n${
    item.status === "summraized" ? `\`✨AI Summarized\`  ` : ""
  }${["raw", "failedToSummarize"].includes(item?.status ?? "") ? `\`Raw Content\`  ` : ""}\`Pub Date: ${dayjs(
    item.pubDate,
  ).format("YYYY-MM-DD HH:mm")}\`  \`Creator: ${item.creator ?? "none"}\`\n\n`;
}

function addEllipsis(content: string, maxLen: number): string {
  if (content.length > maxLen && content.endsWith("...")) {
    return content.substring(0, maxLen) + "...";
  }
  return content;
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
export async function formatRSSItems(items: RSSItem[]): Promise<RSSItem[]> {
  return Promise.all(
    items.map(async (item) => {
      const content = (item.content || "").replace("&lt;", "<").replace("&gt;", ">");
      const summary = (item.summary || "").replace("&lt;", "<").replace("&gt;", ">");

      if (isXML(content)) {
        try {
          const text = extractTextFromXML(content);
          console.log(`format content \`${item.title}\`: ${text}`);
          item.content = text.trim();
        } catch (error: any) {
          console.error(`Failed to parse XML content: ${error.message}`);
        }
      }

      if (isXML(summary)) {
        try {
          const text = extractTextFromXML(summary);
          console.log(`format summary \`${item.title}\`: ${text}`);
          item.summary = text.trim();
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
  splitByTags?: boolean;
  ignoreIntroduction?: boolean;
  itemLinkFormat?: (link: string, item: RSSItem) => string;
  onProgress?: (stage: DigestStage, err?: Error) => void;
}): Promise<{
  content: string;
  items: DigestItem[];
  createAt: number;
}> {
  const now = Date.now();
  console.time(`gen digest ${now}`);
  const limit = pLimit(options.maxApiConcurrency ?? 3);
  const { splitByTags, ignoreIntroduction, onProgress } = options;

  const rssFeeds = options.rssFeeds;

  // 第一步：获取并过滤所有RSS items
  const allFilteredItems = await getAllFilteredItems(rssFeeds, options.httpProxy, options.requestTimeout, onProgress);

  // 第二步：格式化rss item
  let formatedItems = (await formatRSSItems(allFilteredItems)) as RSSItemWithStatus[];

  console.log(`${formatedItems.length} rss items found after filter`, formatedItems);

  // 第三步：翻译titles
  async function translateTitles() {
    if (options.translateTitles) {
      console.time("translate titles");
      try {
        onProgress?.({
          stageName: "translate_titles",
          status: "start",
          data: null,
        });
        const translatedTitles = await options.translateTitles(formatedItems.map((item) => item.title || ""));

        console.log("translated titles success:", translatedTitles);

        formatedItems.forEach((item, index) => {
          item.title = translatedTitles[index] ?? item.title;
        });
        onProgress?.({
          stageName: "translate_titles",
          status: "success",
          data: null,
        });
      } catch (err: any) {
        onProgress?.(
          {
            stageName: "translate_titles",
            status: "failed",
            data: null,
          },
          err,
        );
        console.error("translate titles failed", err);
      } finally {
        console.timeEnd("translate titles");
      }
    }
  }

  // 第四步：并发地对items进行概述
  const [, ...summarizedItems] = await Promise.all([
    translateTitles(),
    ...formatedItems.map((item) =>
      limit(async () => {
        // 避免translateTitles失败
        await sleep(100);
        return summarizeItem(
          item,
          options.provider,
          options.requestTimeout,
          options.retryCount,
          options.retryDelay,
          onProgress,
        );
      }),
    ),
  ]);

  formatedItems = summarizedItems.map((item) => ({
    ...item,
    link: options.itemLinkFormat ? options.itemLinkFormat(item.link ?? "", item) : item.link,
  }));

  console.timeEnd(`gen digest ${now}`);

  // 第五步：生成并返回摘要
  return {
    content: generateDigestTemplate(options.provider, formatedItems, splitByTags, ignoreIntroduction),
    items: formatedItems.map((item) => ({
      status: item.status!,
    })),
    createAt: Date.now(),
  };
}
