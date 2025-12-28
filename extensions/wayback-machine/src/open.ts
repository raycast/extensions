import type { LaunchProps } from "@raycast/api";
import { closeMainWindow, getSelectedText, open, showHUD, getPreferenceValues } from "@raycast/api";
import { WAYBACK_BASE_URL, WAYBACK_API_URL, urlRegex } from "./lib";

type WaybackArguments = {
  url: string;
};

export default async function main(props: LaunchProps<{ arguments: WaybackArguments }>) {
  closeMainWindow();

  if (props.arguments.url && urlRegex.test(props.arguments.url)) {
    await openPage(props.arguments.url);
    return;
  }

  try {
    const selectedText = await getSelectedText();

    if (!urlRegex.test(selectedText)) {
      return showHUD("❌ No domain found");
    }

    await openPage(selectedText);
  } catch (error) {
    console.error(error);
  }
}

async function openPage(webpageUrl: string) {
  const { defaultView } = getPreferenceValues<Preferences>();

  try {
    const res = await fetch(`${WAYBACK_API_URL}?url=${webpageUrl}`);

    if (res.status >= 400) {
      return showHUD("❌ Bad response from server");
    }

    const archive = (await res.json()) as {
      archived_snapshots?: {
        closest?: {
          url: string;
        };
      };
    };

    if (archive.archived_snapshots?.closest?.url) {
      if (defaultView && defaultView !== "snapshot") {
        // URLs view needs special handling: use "web/*" path with trailing wildcard on URL
        if (defaultView === "web/urls") {
          await open(`${WAYBACK_BASE_URL}/web/*/${webpageUrl}*`);
          return;
        }
        await open(`${WAYBACK_BASE_URL}/${defaultView}/${webpageUrl}`);
        return;
      }

      const url = new URL(archive.archived_snapshots.closest.url);
      await open(`https://${url.host}${url.pathname}`);
      return;
    }

    return showHUD("❌ No archived version found");
  } catch {
    return showHUD(`❌ An error occurred, try again later`);
  }
}
