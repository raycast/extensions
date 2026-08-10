import { compactHighlightContentsResponse, compactTextContentsResponse, getPageContents } from "../exa";

type Input = {
  /**
   * URLs of webpages to retrieve, separated by commas or new lines.
   */
  urls: string;
  /**
   * Which content view to return for each URL.
   */
  mode?: "text" | "highlights";
};

/**
 * Retrieves the contents of webpages, together with per-URL statuses.
 */
export default async function (input: Input) {
  const mode = input.mode ?? "highlights";
  const urls = input.urls
    .split(/[\n,]/)
    .map((url) => url.trim())
    .filter(Boolean);

  if (mode === "highlights") {
    return compactHighlightContentsResponse(await getPageContents(urls, "highlights"));
  }

  return compactTextContentsResponse(await getPageContents(urls, "text"));
}
