import { getPreferenceValues } from "@raycast/api";
import { PreferenceValues } from "@raycast/api/types/api/environment/preferences";
import { runAppleScriptSilently } from "./utils";

export async function showPreviousTrackNotification() {
  const preferences = getPreferenceValues<PreferenceValues>();
  if (false === preferences.previousTrackNotificationEnabled) {
    return;
  }

  await showNotification();
}

export async function showNextTrackNotification() {
  const preferences = getPreferenceValues<PreferenceValues>();
  if (false === preferences.previousTrackNotificationEnabled) {
    return;
  }

  await showNotification();
}

async function showNotification() {
  const command = `
      if application "Spotify" is not running then
          return
      end if
    
      property currentTrackName : "Unknown Track"
      property currentTrackArtist : "Unknown Artist"
    
      tell application "Spotify"
          try
              set currentTrackName to name of the current track
              set currentTrackArtist to artist of the current track
          end try
      end tell
    
      display notification with title currentTrackArtist subtitle currentTrackName`;

  await runAppleScriptSilently(command);
}
