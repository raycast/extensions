import {
  environment,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  LocalStorage,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { runAppleScript } from "run-applescript";

export async function playStream(streamName: string, stationURL: string): Promise<string | number> {
  // Plays a station's stream URL in Music.app
  const isPlaying = await LocalStorage.getItem("-is-playing");
  const prevTrackID = await LocalStorage.getItem("-current-track-id");
  const prevStationName = await LocalStorage.getItem("-current-station-name");

  const preferences = getPreferenceValues<ExtensionPreferences>();
  // const audioApplication = preferences.audioApplication;
  const audioApplication = "music";

  if (isPlaying == "true") {
    // Pause & remove the current stream before playing a new one
    // await pausePlayback();
    // await deleteTrack(prevTrackID?.toString(), prevStationName?.toString());
  }

  let streamID = "";
  if (audioApplication == "music") {
    streamID = await runAppleScript(`try
        tell application "Music"
          launch
          tell application "System Events"
            repeat while "Music" is not in (name of every process whose background only is false)
              delay 0.5
            end repeat
          end tell

          try
            set trackIDs to get id of URL tracks
            open location "${stationURL}"
            repeat with newID in (get id of URL tracks)
                if newID is not in trackIDs then
                    set theStream to track id newID
                    set name of theStream to "Raycast: ${streamName}"
                    return contents of newID
                end if
            end repeat
          on error
            open location "${stationURL}"
            delay 0.5
            try
              set name of URL track 1 to "Raycast: ${streamName}"
              return id of URL track 1
            on error
              return ""
            end try
          end try
        end tell
      on error
        return "err:noapp"
      end try`);
  } else if (audioApplication == "quicktime") {
    streamID = await runAppleScript(`try
        tell application "QuickTime Player"
          open location "${stationURL}"
          repeat while visible of window 1 = false
            delay 0.5
          end repeat
          delay 1
          set visible of window 1 to false
          return name of document 1
        end tell
      on error
        return "err:noapp"
      end try`);
  } else if (audioApplication == "vlc") {
    streamID = await runAppleScript(`try
        tell application "VLC"
          open location "${stationURL}"
          return path of current item
        end tell
      on error
        return "err:noapp"
      end try`);
  } else if (audioApplication == "vox") {
    streamID = await runAppleScript(`try
        tell application "Vox"
          playUrl "${stationURL}"
          return track 
        end tell
      on error
        return "err:noapp"
      end try`);
  }

  if (streamID === "err:noapp") {
    // Couldn't find target application
    if (environment.launchType == LaunchType.Background || environment.commandName === "menubar-radio") {
      await showHUD("Error: Audio Application Not Found!");
    } else {
      await showToast({ title: "Error: Audio Application Not Found!", style: Toast.Style.Failure });
    }
    return -1;
  }

  await LocalStorage.setItem("-is-playing", "true");
  await LocalStorage.setItem("-current-stream-name", streamName);
  await LocalStorage.setItem("-current-stream-url", stationURL);
  await LocalStorage.setItem("-current-track-id", streamID);
  await launchCommand({ name: "current-stream", type: LaunchType.Background });

  if (environment.commandName != "menubar-radio") {
    try {
      await launchCommand({ name: "menubar-radio", type: LaunchType.Background });
    } catch (error) {
      console.log("Menubar Radio command is disabled.");
    }
  }

  return streamID;
}
