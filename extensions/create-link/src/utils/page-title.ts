import { TextDecoder } from "node:util";
import { fetchGitHubTitleViaCli } from "./github-title";

const HTTP_TIMEOUT_MS = 6000;
const MAX_HTML_BYTES = 1024 * 1024;

export function isWebUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function decodeHtmlEntities(text: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    mdash: "\u2014",
    ndash: "\u2013",
  };
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (entity, name: string) => {
    if (!name.startsWith("#")) return Object.hasOwn(named, name) ? named[name] : entity;
    const hex = name[1].toLowerCase() === "x";
    const point = Number.parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10);
    if (point === 0 || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) return "\ufffd";
    return String.fromCodePoint(point);
  });
}

function extractTitle(html: string, atEnd = false): string | undefined {
  const headEnd = html.search(/<\/head\s*>/i);
  const head = headEnd >= 0 ? html.slice(0, headEnd) : html;
  const title = head.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]?.trim();
  if (title) return decodeHtmlEntities(title);
  if (headEnd < 0 && !atEnd) return undefined;

  const metaTags = head.match(/<meta\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi) ?? [];
  for (const tag of metaTags) {
    const attributes = new Map(
      [...tag.matchAll(/([^\s=<>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((match) => [
        match[1].toLowerCase(),
        match[2] ?? match[3],
      ]),
    );
    if (attributes.get("property")?.toLowerCase() === "og:title") {
      const content = attributes.get("content")?.trim();
      if (content) return decodeHtmlEntities(content);
    }
  }
  return "";
}

async function fetchHtmlTitle(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

    let html = "";
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let bytesRead = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const remaining = MAX_HTML_BYTES - bytesRead;
          html += decoder.decode(value.subarray(0, remaining), { stream: true });
          const title = extractTitle(html);
          if (title !== undefined) {
            clearTimeout(timeout);
            await reader.cancel();
            return title || url;
          }
          bytesRead += value.byteLength;
          if (bytesRead > MAX_HTML_BYTES) {
            controller.abort();
            throw new Error("Page response exceeds the 1 MiB limit");
          }
        }
        html += decoder.decode();
      } finally {
        reader.releaseLock();
      }
    }
    return extractTitle(html, true) || url;
  } finally {
    controller.abort();
    clearTimeout(timeout);
  }
}

export async function fetchPageTitle(url: string): Promise<string> {
  return (await fetchGitHubTitleViaCli(new URL(url))) ?? (await fetchHtmlTitle(url));
}
