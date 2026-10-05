import { BrowserExtension } from "@raycast/api";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { decodeEntities, HnItem, htmlToText } from "./hn-api";

function normalizeUrl(url: string) {
  return url.replace(/#.*$/, "").replace(/\/$/, "");
}

async function readOpenTab(url: string) {
  try {
    const tabs = await BrowserExtension.getTabs();
    const tab = tabs.find((tab) => normalizeUrl(tab.url) === normalizeUrl(url));
    if (!tab) return null;
    return await BrowserExtension.getContent({ tabId: tab.id, format: "markdown" });
  } catch {
    // Fails without the Raycast browser extension, so fetching the page is the fallback
    return null;
  }
}

async function fetchArticle(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`The site returned ${response.status} ${response.statusText}.`);
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("html")) throw new Error(`The link is ${type.split(";")[0] || "not a web page"}, not an article.`);

  const { document } = parseHTML(await response.text());
  const article = new Readability(document as never).parse();
  const text = articleText(article?.content ?? "");
  if (!text) throw new Error("No article text was found on the page.");
  return text;
}

function articleText(html: string) {
  return decodeEntities(
    html
      .replace(/<(br|\/?(p|div|h[1-6]|li|blockquote|pre|tr|figure|section|header|footer))\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export async function readStoryContent(item: HnItem) {
  if (!item.url) return { source: "Hacker News post", content: htmlToText(item.text ?? "") };
  const fromTab = await readOpenTab(item.url);
  if (fromTab) return { source: "open browser tab", content: fromTab };
  try {
    return { source: "fetched page", content: await fetchArticle(item.url) };
  } catch (error) {
    throw new Error(`Couldn't read ${item.url}: ${error instanceof Error ? error.message : error}`);
  }
}
