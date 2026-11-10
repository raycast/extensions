import { runAppleScript } from "@raycast/utils";

export type Player = ExtensionPreferences["defaultApp"];

// QuickTime refuses Apple events until it runs (error -600), hence `activate` before `open URL`.
// It names a stream's document after the stream file, so only FIP streams get closed.
const QUICKTIME_PLAY = `
on run argv
  tell application "QuickTime Player"
    activate
    close (every document whose name ends with "_hifi.m3u8")
    open URL (item 1 of argv)
  end tell
end run
`;

const QUICKTIME_STOP = `
if application "QuickTime Player" is running then
  tell application "QuickTime Player" to close (every document whose name ends with "_hifi.m3u8")
end if
`;

const VLC_PLAY = `
on run argv
  tell application "VLC"
    activate
    OpenURL (item 1 of argv)
  end tell
end run
`;

const VLC_STOP = `
if application "VLC" is running then
  tell application "VLC"
    if playing then stop
    quit
  end tell
end if
`;

export async function play(streamUrl: string, player: Player): Promise<void> {
  await runAppleScript(player === "VLC" ? VLC_PLAY : QUICKTIME_PLAY, [streamUrl]);
}

export async function stop(player: Player): Promise<void> {
  await runAppleScript(player === "VLC" ? VLC_STOP : QUICKTIME_STOP);
}
