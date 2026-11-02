import { Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { getInitialIconDataUri } from "./avatar";
import { toOpenableUrl } from "./format";
import { Item } from "./types";
import { getItemIcon } from "./utils";

/** A login's initials, or its website's icon with Show Website Icons; other items show their type. */
export function getListIcon(item: Item, showWebsiteIcons: boolean): Image.ImageLike {
  if (item.type !== "login") return getItemIcon(item.type);
  const initials = getInitialIconDataUri(item.title);
  const url = item.urls?.[0];
  // Website icons come from the favicon provider set in Raycast, which receives the domain, so they're opt-in.
  return showWebsiteIcons && url
    ? getFavicon(toOpenableUrl(url), { fallback: initials, mask: Image.Mask.RoundedRectangle })
    : { source: initials, fallback: getItemIcon(item.type) };
}
