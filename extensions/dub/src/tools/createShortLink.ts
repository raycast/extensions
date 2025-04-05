import { withAccessToken } from "@raycast/utils";
import { dubOAuth } from "../api/oauth";
import { createShortLink } from "../api";

type Input = {
  /**
   * The original URL to shorten
   *
   * @example https://www.raycast.com
   */
  originalUrl: string;
  /**
   * A custom key for the short link (optional)
   */
  key?: string;
  /**
   * The domain to use for the short link, use the getAllDomains tool to get a list of domains (optional)
   */
  domain?: string;
  /**
   * Comments about the short link (optional)
   */
  comments?: string;
};

async function createShortLinkTool(input: Input) {
  console.log("input", input);
  const shortLink = await createShortLink({
    originalUrl: input.originalUrl,
    key: input.key,
    domain: input.domain,
    comments: input.comments,
  });
  return shortLink;
}

export default withAccessToken(dubOAuth)(createShortLinkTool);
