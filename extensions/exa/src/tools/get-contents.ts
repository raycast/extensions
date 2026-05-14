import { compactHighlightContentsResponse, compactTextContentsResponse, getPageContents } from "../exa";

type Input = {
  /**
   * The URLs of the webpages to retrieve the contents of.
   */
  urls: string[];
  /**
   * Which content view to return for each URL.
   * @default "highlights"
   */
  mode?: "text" | "highlights";
};

/**
 * Retrieves the contents of webpages, together with per-URL statuses.
 */
export default async function (input: Input) {
  const mode = input.mode ?? "highlights";

  if (mode === "highlights") {
    return compactHighlightContentsResponse(await getPageContents(input.urls, "highlights"));
  }

  return compactTextContentsResponse(await getPageContents(input.urls, "text"));
}
