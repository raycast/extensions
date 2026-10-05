import { Color, Icon, Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

import { isPrivateHostname } from "./network";

export function getBookmarkIcon(url: string, favicon?: string) {
  if (favicon) {
    return {
      source: favicon,
      fallback: Icon.Globe,
      mask: Image.Mask.RoundedRectangle,
    };
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      if (isPrivateHostname(parsed.hostname)) {
        return { source: Icon.Network, tintColor: Color.SecondaryText };
      }

      return getFavicon(url, { fallback: Icon.Globe, mask: Image.Mask.RoundedRectangle });
    }
  } catch {
    // Invalid URL (e.g. about:, javascript:, data:)
  }
  return Icon.Globe;
}
