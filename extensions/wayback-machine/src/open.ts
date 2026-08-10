import type { LaunchProps } from "@raycast/api";
import { closeMainWindow, getSelectedText, open, showHUD, getPreferenceValues } from "@raycast/api";
import { WAYBACK_BASE_URL, isValidUrl, extractUrls, checkSnapshot } from "./lib";

type WaybackArguments = {
  url: string;
};

export default async function main(props: LaunchProps<{ arguments: WaybackArguments }>) {
  closeMainWindow();

  if (props.arguments.url && isValidUrl(props.arguments.url)) {
    await openPage(props.arguments.url);
    return;
  }

  try {
    const selectedText = await getSelectedText();
    const urls = extractUrls(selectedText);

    if (urls.length === 0) {
      return showHUD("❌ No domain found");
    }

    await openPage(urls[0]);
  } catch (error) {
    console.error(error);
    return showHUD("❌ No URL provided or selected");
  }
}

async function openPage(webpageUrl: string) {
  const { defaultView, checkForSnapshots } = getPreferenceValues<Preferences>();

  // If snapshot check is enabled, verify the URL has an archived version
  if (checkForSnapshots) {
    const snapshot = await checkSnapshot(webpageUrl);

    if (!snapshot) {
      return showHUD("❌ No archived version found");
    }

    // For "snapshot" view, open the exact snapshot URL
    if (!defaultView || defaultView === "snapshot") {
      const url = new URL(snapshot.url);
      await open(`https://${url.host}${url.pathname}`);
      return;
    }
  }

  // Open the requested view directly
  if (defaultView) {
    // For "snapshot" view without checking, open the latest snapshot
    if (defaultView === "snapshot") {
      await open(`${WAYBACK_BASE_URL}/web/${webpageUrl}`);
      return;
    }
    // URLs view needs special handling: use "web/*" path with trailing wildcard on URL
    if (defaultView === "web/urls") {
      await open(`${WAYBACK_BASE_URL}/web/*/${webpageUrl}*`);
      return;
    }
    await open(`${WAYBACK_BASE_URL}/${defaultView}/${webpageUrl}`);
    return;
  }

  // Default: open the calendar view for the URL
  await open(`${WAYBACK_BASE_URL}/web/*/${webpageUrl}`);
}
