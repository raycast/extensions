import { Icon } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

export function getBookmarkIcon(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return getFavicon(url);
    }
  } catch {
    // Invalid URL (e.g. about:, javascript:, data:)
  }
  return Icon.Globe;
}
