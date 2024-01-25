import fetch, { RequestInit } from "node-fetch";
import { isURL, withTimeout } from "./util";
import { createAgent } from "./biz";
import { load } from "cheerio";

export async function request(url: URL | string, options?: RequestInit, timeout?: number) {
  return withTimeout(
    fetch(url, {
      ...options,
      agent: createAgent(),
    }),
    timeout ?? 20000,
  );
}

interface Metadata {
  title: string;
  favicon: string;
}

interface Metadata {
  title: string;
  favicon: string;
  coverImageUrl: string;
}

export async function fetchMetadata(url: string): Promise<Metadata> {
  const response = await request(url);
  const body = await response.text();
  const $ = load(body);

  const title = $("title").text();
  let favicon = $('link[rel="icon"], link[rel="shortcut icon"]').attr("href") ?? "";

  // 处理相对路径的 favicon
  if (favicon && !favicon.startsWith("http")) {
    const baseUrl = new URL(url).origin;
    favicon = new URL(favicon, baseUrl).href;
  }

  // 尝试获取封面图 URL
  let coverImageUrl = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content");
  // 取其它的并不准确
  // $('link[rel="image_src"]').attr("href") ||
  // $("img").first().attr("src");

  // 处理相对路径的封面图 URL
  if (coverImageUrl && !coverImageUrl.startsWith("http")) {
    coverImageUrl = new URL(coverImageUrl, new URL(url).origin).href;
  }

  console.log(`url: ${url} ; title: ${title}; favicon: ${favicon} ; coverImageUrl: ${coverImageUrl}`);

  return { title, favicon, coverImageUrl: coverImageUrl ?? "" };
}

export async function isValidRSSLink(url: string): Promise<boolean> {
  if (!isURL(url)) return false;

  const response = await request(url);
  const contentType = response.headers.get("content-type");
  const text = await response.text();

  // 检查内容类型是否为 XML
  if (!contentType || !contentType.includes("xml")) {
    return false;
  }

  // 检查是否包含 RSS 特有的标签
  return text.includes("<rss") || text.includes("<channel") || text.includes("<feed");
}
