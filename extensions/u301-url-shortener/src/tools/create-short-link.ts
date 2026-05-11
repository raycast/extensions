import { shortenURL } from "../util";

type Input = {
  /**
   * The full original URL to shorten*
   * @example https://www.raycast.com
   */
  url: string;
  /**
   * A custom slug for the short link (optional)
   */
  slug?: string;
  /**
   * The domain to use for the short link (optional)
   * @example u301.co
   */
  domain?: string;
  /**
   * Comments about the short link (optional)
   */
  comment?: string;
};

export default async function createShortLink(input: Input) {
  console.log("input", input);
  const shortened = await shortenURL({
    url: input.url,
    domain: input.domain,
    slug: input.slug,
    comment: input.comment,
  });
  return shortened;
}
