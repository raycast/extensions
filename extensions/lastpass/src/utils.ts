import { Icon, Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

export const isValidUrl = (urlLike: string | undefined) => urlLike && urlLike !== "http://sn";
export const getDomainFavicon = (url: string | undefined): Image.ImageLike => {
  if (!url) {
    return Icon.Key;
  }
  try {
    new URL(url || "");
    return getFavicon(url);
  } catch {
    return Icon.Key;
  }
};
