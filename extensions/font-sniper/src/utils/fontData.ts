import type { FontInfo } from "../types";
import { isValidUrl } from "./urlHelpers";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function readFontData(
  font: FontInfo,
  pageUrl?: string,
  signal?: AbortSignal,
): Promise<Buffer> {
  if (font.isDataUri) {
    if (!font.dataUriContent)
      throw new Error("The embedded font has no base64 data.");
    return Buffer.from(font.dataUriContent, "base64");
  }
  if (!isValidUrl(font.url)) throw new Error("Unsupported font URL.");
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "*/*",
  };
  if (pageUrl) {
    headers["Referer"] = pageUrl;
  }

  const response = await fetch(font.url, { headers, signal });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
