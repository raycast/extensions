import { Clipboard, LocalStorage, showToast, Toast } from "@raycast/api";
import { Defuddle } from "defuddle/node";
import { parseHTML } from "linkedom";
import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const HISTORY_KEY = "defuddle-markdown-history";
const MAX_HISTORY_ITEMS = 25;
const IMAGE_CHECK_TIMEOUT_MS = 4000;
const MAX_IMAGES_TO_VALIDATE = 8;
const MAX_INPUT_LENGTH = 6000;

export type HistoryItem = {
  id: string;
  url: string;
  title: string;
  markdown: string;
  createdAt: string;
  author?: string;
  domain?: string;
  wordCount?: number;
};

export type ExtractedMarkdown = Omit<HistoryItem, "id" | "createdAt">;

export async function extractMarkdown(url: string): Promise<ExtractedMarkdown> {
  const toast = await showToast(Toast.Style.Animated, "Fetching page", url);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Raycast Defuddle Markdown Extension)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status} ${response.statusText}`);
    }

    toast.title = "Extracting content";
    const html = await response.text();
    const parsed = parseHTML(html) as unknown as { document: Document };
    const { document } = parsed;
    const result = await Defuddle(document, url, { markdown: true });
    const markdown = result.contentMarkdown || result.content;

    if (!markdown.trim()) {
      throw new Error("Defuddle did not find readable content on this page.");
    }

    const markdownWithoutInlineSvg = removeInlineSvgBlocks(markdown);
    const sanitizedMarkdown = await removeBrokenImages(markdownWithoutInlineSvg, url);

    toast.style = Toast.Style.Success;
    toast.title = "Markdown extracted";
    toast.message = result.title || url;

    return {
      url,
      title: result.title || new URL(url).hostname,
      markdown: sanitizedMarkdown,
      author: result.author || undefined,
      domain: result.domain || undefined,
      wordCount: result.wordCount || undefined,
    };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Extraction failed";
    toast.message = error instanceof Error ? error.message : String(error);
    throw error;
  }
}

export async function copyMarkdown(markdown: string) {
  await Clipboard.copy(markdown);
  await showToast(Toast.Style.Success, "Copied Markdown");
}

export async function saveMarkdownFile(item: HistoryItem) {
  const fileName = `${slugify(item.title || new URL(item.url).hostname)}.md`;
  const filePath = path.join(homedir(), "Downloads", fileName);
  await writeFile(filePath, item.markdown, "utf8");
  await showToast(Toast.Style.Success, "Saved Markdown", filePath);
}

export async function loadHistory(): Promise<HistoryItem[]> {
  const value = await LocalStorage.getItem<string>(HISTORY_KEY);
  return value ? (JSON.parse(value) as HistoryItem[]) : [];
}

export async function saveToHistory(item: ExtractedMarkdown): Promise<HistoryItem> {
  const history = await loadHistory();
  const historyItem: HistoryItem = {
    ...item,
    id: `${Date.now()}-${item.url}`,
    createdAt: new Date().toISOString(),
  };
  const nextHistory = [historyItem, ...history.filter((entry) => entry.url !== item.url)].slice(0, MAX_HISTORY_ITEMS);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
  return historyItem;
}

export async function removeFromHistory(id: string): Promise<HistoryItem[]> {
  const nextHistory = (await loadHistory()).filter((item) => item.id !== id);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
  await showToast(Toast.Style.Success, "Removed from History");
  return nextHistory;
}

export async function clearHistory(): Promise<HistoryItem[]> {
  await LocalStorage.removeItem(HISTORY_KEY);
  await showToast(Toast.Style.Success, "Cleared History");
  return [];
}

export function normalizeUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > MAX_INPUT_LENGTH || looksLikeMarkupPayload(trimmed)) {
    return undefined;
  }

  const candidates = trimmed.match(
    /https?:\/\/[^\s<>"')\]]+|(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,24}\b[-a-zA-Z0-9()@:%_+.~#?&/=]*/g,
  );
  const candidate = candidates
    ?.map((entry) => entry.replace(/[.,;:!?]+$/, ""))
    .find((entry) => entry.length > 0 && !isLikelySvgNamespaceUrl(entry));
  if (!candidate) {
    return undefined;
  }

  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;

  try {
    const parsedUrl = new URL(withProtocol);
    if (!parsedUrl.hostname.includes(".")) {
      return undefined;
    }
    if (isLikelySvgNamespaceUrl(parsedUrl.toString())) {
      return undefined;
    }
    return parsedUrl.toString();
  } catch {
    return undefined;
  }
}

export function formatLoadingMarkdown(url: string): string {
  return `# Extracting Markdown\n\n> Defuddle is fetching the page, isolating the readable content, and converting it to Markdown.\n\n**Source**\n\n[${url}](${url})`;
}

export function formatErrorMarkdown(url: string, error: string): string {
  return `# Could Not Extract Markdown\n\n**Source**\n\n[${url}](${url})\n\n**Error**\n\n\`${error}\``;
}

export function formatMarkdownForDetail(item: HistoryItem): string {
  const title = item.title || item.url;
  return `# ${title}\n\n> Extracted from [${item.url}](${item.url})${item.wordCount ? ` · ${item.wordCount} words` : ""}\n\n---\n\n${item.markdown}`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "defuddle-markdown"
  );
}

function looksLikeMarkupPayload(value: string): boolean {
  const hasMarkupTags = /<\s*(svg|path|rect|circle|g|defs|mask|html|body|div|span|p|a)\b/i.test(value);
  const angleBracketDensity = (value.match(/[<>]/g)?.length ?? 0) / Math.max(value.length, 1);
  return hasMarkupTags || angleBracketDensity > 0.01;
}

function isLikelySvgNamespaceUrl(candidate: string): boolean {
  if (/^data:image\/svg\+xml/i.test(candidate)) {
    return true;
  }

  try {
    const parsedUrl = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
    if (parsedUrl.hostname === "www.w3.org" || parsedUrl.hostname === "w3.org") {
      return parsedUrl.pathname.startsWith("/2000/svg") || parsedUrl.pathname.startsWith("/1999/xhtml");
    }
    return false;
  } catch {
    return false;
  }
}

async function removeBrokenImages(markdown: string, baseUrl: string): Promise<string> {
  const imageUrls = collectMarkdownImageUrls(markdown).slice(0, MAX_IMAGES_TO_VALIDATE);
  if (imageUrls.length === 0) {
    return markdown;
  }

  const validityEntries = await Promise.all(
    imageUrls.map(async (rawUrl) => {
      const resolvedUrl = resolveImageUrl(rawUrl, baseUrl);
      if (!resolvedUrl) {
        return [rawUrl, false] as const;
      }

      const isReachable = await canFetchImage(resolvedUrl);
      return [rawUrl, isReachable] as const;
    }),
  );

  const validImages = new Map(validityEntries);
  return markdown.replace(/!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (match, imageUrl) => {
    return validImages.get(imageUrl) === false ? "" : match;
  });
}

function removeInlineSvgBlocks(markdown: string): string {
  return markdown
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<svg[^>]*\/>/gi, "")
    .replace(/\n{3,}/g, "\n\n");
}

function collectMarkdownImageUrls(markdown: string): string[] {
  const regex = /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const uniqueUrls: string[] = [];

  let match = regex.exec(markdown);
  while (match) {
    const imageUrl = match[1];
    if (!uniqueUrls.includes(imageUrl)) {
      uniqueUrls.push(imageUrl);
    }
    match = regex.exec(markdown);
  }

  return uniqueUrls;
}

function resolveImageUrl(imageUrl: string, baseUrl: string): string | undefined {
  try {
    return new URL(imageUrl, baseUrl).toString();
  } catch {
    return undefined;
  }
}

async function canFetchImage(imageUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_CHECK_TIMEOUT_MS);

  try {
    const headResponse = await fetch(imageUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });

    if (headResponse.ok) {
      return true;
    }

    if (headResponse.status === 405 || headResponse.status === 501) {
      const getResponse = await fetch(imageUrl, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
      });
      return getResponse.ok;
    }

    return false;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
