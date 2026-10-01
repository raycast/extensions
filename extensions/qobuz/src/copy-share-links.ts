import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getClient } from "./lib/client";
import { nowPlaying } from "./lib/now-playing-track";
import { countServices, shareClipboard, shareLinks, shareTitle } from "./lib/share";

export default async function Command() {
  try {
    const track = await nowPlaying(await getClient());
    if (!track) {
      await showToast({ style: Toast.Style.Failure, title: "Nothing playing in Qobuz" });
      return;
    }

    const links = await shareLinks(track);
    await Clipboard.copy(shareClipboard(track, links));
    await showHUD(`Copied ${countServices(links)} links for ${shareTitle(track)}`);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't copy share links" });
  }
}
