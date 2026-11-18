import { withAccessToken } from "@raycast/utils";
import { getAuthentication, tinyfish } from "../auth";
import { fetchTinyFishPages } from "../tinyfish";
import { fetchToolResult, type FetchToolResult } from "../tool-results";

type Input = {
  /** 1–10 complete HTTP(S) URLs. */
  urls: string[];
  format?: "markdown" | "html" | "json";
  /** What you need from these pages, up to 2,000 characters. */
  purpose?: string;
  /** Include outbound links. */
  links?: boolean;
  /** Include image URLs. */
  image_links?: boolean;
  /** Cache tolerance in seconds. Use 0 to fetch fresh content. */
  ttl?: number;
  /** 1–20 standard CSS selectors to include. Each at most 1,000 characters. Omit for the whole page. */
  include_selectors?: string[];
  /** 1–20 CSS selectors to remove before extraction. */
  exclude_selectors?: string[];
};

async function tool(input: Input): Promise<FetchToolResult> {
  const response = await fetchTinyFishPages({
    ...input,
    authentication: await getAuthentication(),
    signal: AbortSignal.timeout(150000),
  });
  return fetchToolResult(response, input.format);
}

export default withAccessToken(tinyfish)(tool);
