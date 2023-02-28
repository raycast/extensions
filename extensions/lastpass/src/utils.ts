import { Icon } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

export const isValidUrl = (urlLike: string | undefined) => urlLike && urlLike !== "http://sn";
export const getDomainFavicon = (url: string | undefined) => getFavicon(url || "", { fallback: Icon.Key });
