import xml2js from "xml2js";
import { parseRSS } from "./biz";
import { Source } from "../types";

const processOutline = async (outline: any, tags: string[] = []): Promise<Source[]> => {
  let sources: Source[] = [];

  // 如果outline是一个数组，递归处理每一个元素
  if (Array.isArray(outline)) {
    for (const item of outline) {
      sources = sources.concat(await processOutline(item, tags));
    }
  } else if (outline.outline) {
    // 如果outline包含子outline
    const newTags = tags.slice(); // 复制现有的标签
    if (outline.text) {
      // 如果当前outline有text，视为一个新的标签
      newTags.push(outline.text);
    }
    sources = sources.concat(await processOutline(outline.outline, newTags));
  } else if (outline["$"].type === "rss") {
    // 如果是一个rss类型的outline
    const rssLink = outline["$"].xmlUrl;
    const hasURL = !!outline["$"].htmlUrl;
    let url = outline["$"].htmlUrl;

    try {
      if (!hasURL) {
        const res = await parseRSS(rssLink!);
        url = res.link;
      }
    } catch (error) {
      throw new Error(`rss link ${rssLink} getting url failed`);
    }

    sources.push({
      id: outline["$"].xmlUrl,
      url,
      title: outline["$"].title,
      rssLink: outline["$"].xmlUrl,
      schedule: "everyday", // 默认值，因为OPML不包含这个信息
      description: outline["$"].text,
      tags: tags, // 使用累积的标签
    });
  }

  return sources;
};

export const parseOpmlToSources = async (opmlData: string): Promise<Source[]> => {
  const parser = new xml2js.Parser({ explicitArray: false });

  const result = await parser.parseStringPromise(opmlData);
  const outlines = result.opml.body.outline;

  // 开始处理所有顶层outline，没有初始标签
  const sources = await processOutline(outlines);
  return sources;
};
