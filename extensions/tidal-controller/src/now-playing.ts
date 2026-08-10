import { closeMainWindow } from "@raycast/api";

import { runTidalCommand, showMessage, getNowPlaying } from "./util/fn";

export default async function showNowPlaying() {
  await runTidalCommand(async () => {
    await closeMainWindow();

    // Get the window title from AppleScript
    const nowPlayingFull: string = (await getNowPlaying()).full;

    nowPlayingFull !== null && nowPlayingFull !== "TIDAL"
      ? showMessage(nowPlayingFull)
      : showMessage("Now Playing is Not Available - Open Tidal");
  });
}
