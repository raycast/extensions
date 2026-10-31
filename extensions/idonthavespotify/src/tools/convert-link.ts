import { Adapter } from "../@types/global";
import { getSiteUrl } from "../constants";
import { apiCall } from "../shared/conversion";
import { getPlatformTitle, getUniversalUrl } from "../shared/links";

type Input = {
  /** A music URL provided by the user. This tool cannot search by song title or read the clipboard. */
  link: string;
  /** Destination service. Omit to return all available platforms and a universal sharing link. */
  platform?: Adapter;
};

/** Convert a music URL into links on other streaming services. Returns links without opening them or changing the clipboard. */
export default async function convertLink(input: Input) {
  const result = await apiCall(input.link, input.platform);
  const links = result.links
    .filter(({ type }) => !input.platform || type === input.platform)
    .map(({ type, url, isVerified }) => ({
      platform: type,
      platformName: getPlatformTitle(type),
      url,
      isVerified: isVerified === true,
    }));

  return {
    title: result.title,
    description: result.description,
    type: result.type,
    universalUrl: getUniversalUrl(result.universalLink, getSiteUrl()),
    links,
    ...(links.length === 0 ? { message: "No available match found for the requested destination(s)." } : {}),
  };
}
