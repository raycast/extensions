import { lookup } from "node:dns/promises";
import { BlockList } from "node:net";
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

const privateRanges = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
] as const) {
  privateRanges.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
] as const) {
  privateRanges.addSubnet(network, prefix, "ipv6");
}

// Blocks links to localhost or the user's own network, whose pages would otherwise be sent to the AI
async function assertPublicUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("The link isn't a web page.");
  const addresses = await lookup(url.hostname.replace(/^\[|\]$/g, ""), { all: true });
  if (addresses.some(({ address, family }) => privateRanges.check(address, family === 6 ? "ipv6" : "ipv4"))) {
    throw new Error("The link points to a private network address.");
  }
}

async function fetchPublicPage(url: string) {
  let current = new URL(url);
  for (let redirects = 0; redirects <= 5; redirects++) {
    await assertPublicUrl(current);
    const response = await fetch(current, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) return response;
    current = new URL(location, current);
  }
  throw new Error("The link redirects too many times.");
}

async function fetchArticle(url: string) {
  const response = await fetchPublicPage(url);
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
