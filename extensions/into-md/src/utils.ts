import { Clipboard } from "@raycast/api";

const INTO_MD_BASE = "https://into.md/";

export async function fetchMarkdown(url: string): Promise<string> {
  const targetUrl = `${INTO_MD_BASE}${url}`;

  const response = await fetch(targetUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to convert: ${response.status} ${response.statusText}`,
    );
  }

  const text = await response.text();

  // into.md returns HTML error page when conversion fails
  if (
    text.trimStart().startsWith("<!DOCTYPE") ||
    text.trimStart().startsWith("<html")
  ) {
    throw new Error(
      `into.md could not convert this page. The site may be blocking scrapers or using JavaScript-heavy rendering.`,
    );
  }

  return text;
}

export function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function getUrlFromClipboard(): Promise<string | null> {
  const text = await Clipboard.readText();
  if (text && isValidUrl(text.trim())) {
    return text.trim();
  }
  return null;
}

export function getIntoMdUrl(url: string): string {
  return `${INTO_MD_BASE}${url}`;
}
