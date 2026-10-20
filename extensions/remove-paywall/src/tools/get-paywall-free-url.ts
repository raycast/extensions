import { getPreferenceValues } from "@raycast/api";
import { DEFAULT_REMOVE_PAYWALL_SERVICE } from "../constants";
import { getRemovePaywallURL } from "../utils";

type Input = {
  /** The full http or https URL of the article to read. */
  url: string;
};

/** Get a link to read an article through a paywall removal service. */
export default function getPaywallFreeURL({ url }: Input): string {
  let articleURL: URL;
  try {
    articleURL = new URL(url);
  } catch {
    throw new Error("Provide a valid article URL.");
  }

  if (articleURL.protocol !== "http:" && articleURL.protocol !== "https:") {
    throw new Error("The article URL must use http or https.");
  }

  const preferences = getPreferenceValues<Preferences>();
  return getRemovePaywallURL(articleURL.href, preferences.service || DEFAULT_REMOVE_PAYWALL_SERVICE);
}
