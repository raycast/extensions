import { Image, Cache, Icon } from "@raycast/api";
import { MinifluxEntry } from "./types";
import { useEffect, useState } from "react";
import { getFavicon } from "@raycast/utils";

const cache = new Cache();

export const useEntryIcon = (entry: MinifluxEntry): Image.ImageLike => {
  const cachedIcon = cache.get(`icon-${entry.feed_id}`);
  const [icon, setIcon] = useState<Image.ImageLike>(
    cachedIcon
      ? JSON.parse(cachedIcon)
      : {
          source: "",
          mask: Image.Mask.RoundedRectangle,
        }
  );

  useEffect(() => {
    if (!cachedIcon) {
      const fallbackIcon = getFavicon(entry.url, {
        mask: Image.Mask.RoundedRectangle,
        fallback: Icon.Paragraph,
      });
      setIcon(fallbackIcon);
      cache.set(`icon-${entry.feed_id}`, JSON.stringify(fallbackIcon));
    }
  }, [entry.feed_id, entry.url]);

  return icon;
};
