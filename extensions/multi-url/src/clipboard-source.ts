import { Clipboard } from "@raycast/api";

import type { SourceLoaderResult } from "./create-set-from-source-form";
import { parseInputUrls } from "./shared";

const PAGE_TITLE_TIMEOUT_MS = 4000;
const MAX_TITLE_LENGTH = 90;
const MAX_TITLE_HTML_LENGTH = 50_000;
const DEFAULT_CLIPBOARD_SET_NAME = "Clipboard Set";
const TITLE_MATCHERS = [
  /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["'][^>]*>/i,
  /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:title["'][^>]*>/i,
  /<title[^>]*>([\s\S]*?)<\/title>/i,
] as const;

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|amp|apos|gt|lt|nbsp|quot);/gi, (match, entity: string) => {
    const normalized = entity.toLowerCase();
    switch (normalized) {
      case "amp":
        return "&";
      case "apos":
        return "'";
      case "gt":
        return ">";
      case "lt":
        return "<";
      case "nbsp":
        return " ";
      case "quot":
        return '"';
      default: {
        if (!normalized.startsWith("#")) {
          return match;
        }

        const isHex = normalized.startsWith("#x");
        const rawCodePoint = isHex ? normalized.slice(2) : normalized.slice(1);
        const codePoint = Number.parseInt(rawCodePoint, isHex ? 16 : 10);

        if (!Number.isFinite(codePoint)) {
          return match;
        }

        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return match;
        }
      }
    }
  });
}

function sanitizeSuggestedTitle(rawTitle: string): string | null {
  const normalized = decodeHtmlEntities(rawTitle).replace(/\s+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length <= MAX_TITLE_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_TITLE_LENGTH - 3).trim()}...`;
}

function fallbackSingleUrlName(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "");
    return hostname.length > 0 ? hostname : null;
  } catch {
    return null;
  }
}

async function fetchSuggestedPageTitle(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(PAGE_TITLE_TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type")?.toLowerCase();
    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      return null;
    }

    const html = await readTitleHtml(response);
    for (const matcher of TITLE_MATCHERS) {
      const match = html.match(matcher);
      const suggestedTitle = match?.[1] ? sanitizeSuggestedTitle(match[1]) : null;
      if (suggestedTitle) {
        return suggestedTitle;
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function readTitleHtml(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    // If the body can't be streamed, skip the title suggestion rather than buffering an arbitrary-sized response.
    return "";
  }

  const decoder = new TextDecoder();
  let html = "";

  try {
    while (html.length < MAX_TITLE_HTML_LENGTH) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      html += decoder.decode(value, { stream: true });
    }

    html += decoder.decode();
    return html.slice(0, MAX_TITLE_HTML_LENGTH);
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

export async function loadClipboardSource(): Promise<SourceLoaderResult> {
  const clipboardText = await Clipboard.readText();
  if (!clipboardText?.trim()) {
    throw new Error("Clipboard is empty. Copy one or more URLs and try again.");
  }

  const parsed = parseInputUrls(clipboardText);
  let suggestedName = DEFAULT_CLIPBOARD_SET_NAME;

  if (parsed.uniqueValid.length === 1) {
    suggestedName =
      (await fetchSuggestedPageTitle(parsed.uniqueValid[0])) ??
      fallbackSingleUrlName(parsed.uniqueValid[0]) ??
      DEFAULT_CLIPBOARD_SET_NAME;
  }

  return {
    sourceLabel: "Clipboard",
    rawInput: clipboardText,
    suggestedName,
  };
}
