import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { QobuzClient, Track } from "@kud/qobuz";
import { getClient } from "./lib/client";
import { countServices, formatShareMessage, shareLinks, shareTitle } from "./lib/share";

// The Qobuz app rewrites its player-state file on every queue change, so a
// read can land mid-write and parse as "nothing playing". One retry covers it.
const RETRY_DELAY_MS = 150;

const nowPlaying = async (client: QobuzClient): Promise<Track | undefined> => {
  const first = await client.nowPlaying();
  if (first) return first;
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  return client.nowPlaying();
};

export default async function Command() {
  try {
    const client = await getClient();
    const track = await nowPlaying(client);
    if (!track) {
      await showToast({ style: Toast.Style.Failure, title: "Nothing playing in Qobuz" });
      return;
    }

    const links = await shareLinks(track);
    await Clipboard.copy(formatShareMessage(track, links));
    await showHUD(`Copied ${countServices(links)} links for ${shareTitle(track)}`);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't copy share links" });
  }
}
