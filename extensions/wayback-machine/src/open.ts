import type { LaunchProps } from "@raycast/api";
import { closeMainWindow, getSelectedText, open, showHUD, getPreferenceValues } from "@raycast/api";
import fetch from "cross-fetch";

type WaybackArguments = {
  url: string;
};

const urlRegex = /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/;

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
  // Check if the user prefers to open the overview page instead of the snapshot
  const openOverview = getPreferenceValues<Preferences>().openOverview;

  try {
    const res = await fetch(`https://archive.org/wayback/available?url=${webpageUrl}`);

    if (res.status >= 400) {
      return showHUD("❌ Bad response from server");
    }

    const archive = await res.json();

    if (archive.archived_snapshots?.closest?.url) {
      if (openOverview) {
        await open(`https://web.archive.org/web/*/${webpageUrl}`);
        return;
      }

      const url = new URL(archive.archived_snapshots.closest.url);
      await open(`https://${url.host}${url.pathname}`);
      return;
    }

    return showHUD("❌ No archived version found");
  } catch (err) {
    return showHUD(`❌ An error occurred, try again later`);
  }
}
