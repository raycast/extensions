import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getClient } from "./lib/client";
import { nowPlaying } from "./lib/now-playing-track";
import { shareClipboard, shareLinks, shareTitle, slackClipboard } from "./lib/share";

export default async function Command() {
  try {
    const track = await nowPlaying(await getClient());
    if (!track) {
      await showToast({ style: Toast.Style.Failure, title: "Nothing playing in Qobuz" });
      return;
    }

    const links = await shareLinks(track);
    const slack = slackClipboard(track, links);
    // Without a song.link page there is no card worth unfurling, and a bare
    // Qobuz URL unfurls blank, so the full message is the better paste.
    await Clipboard.copy(slack ?? shareClipboard(track, links));
    await showHUD(
      slack
        ? `Copied for Slack: ${shareTitle(track)}`
        : `No preview link found, copied all links for ${shareTitle(track)}`,
    );
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't copy for Slack" });
  }
}
