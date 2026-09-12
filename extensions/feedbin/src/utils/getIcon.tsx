import { Icon } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

export function getIcon(url: string) {
  if (
    URL.canParse(url) &&
    new URL(url)?.host.includes("newsletters.feedbinusercontent.com")
  ) {
    return Icon.Envelope;
  }
  return getFavicon(url);
}
