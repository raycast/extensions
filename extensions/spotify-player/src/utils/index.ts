import { getApplications, showHUD } from "@raycast/api";
import { getState, getTrack } from "../client/applescript";
import { SpotifyPlayingState } from "../client/types";

export async function isSpotifyInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "com.spotify.client");
}

export function trackTitle(track: SpotifyApi.TrackObjectSimplified): string {
  return `${track.artists[0].name} – ${track.name}`;
}

export async function showTrackNotification() {
  try {
    const [state, track] = await Promise.all([getState(), getTrack()]);

    const trackName = (() => {
      if (state.state == SpotifyPlayingState.Playing) {
        return `${track.name} by ${track.artist}`;
      } else if (state.state === SpotifyPlayingState.Paused) {
        return `${track.name} by ${track.artist} (Paused)`;
      } else {
        return "Not playing";
      }
    })();

    await showHUD("🎧 " + trackName);
  } catch (err) {
    console.error(err);
  }
}

export function msToHMS(milliseconds: number): string {
  const totalSeconds = parseInt(Math.floor(milliseconds / 1000).toString());
  const totalMinutes = parseInt(Math.floor(totalSeconds / 60).toString());
  const totalHours = parseInt(Math.floor(totalMinutes / 60).toString());
  const days = parseInt(Math.floor(totalHours / 24).toString());

  const seconds = parseInt((totalSeconds % 60).toString());
  const minutes = parseInt((totalMinutes % 60).toString());
  const hours = parseInt((totalHours % 24).toString());

  const humanized = [pad(hours), pad(minutes), pad(seconds)];

  let time = "";
  if (days > 0) {
    time = `${days}:${humanized[0]}:${humanized[1]}:${humanized[2]}`;
  } else if (hours > 0) {
    time = `${hours}:${humanized[1]}:${humanized[2]}`;
  } else if (seconds > 0) {
    time = `${minutes}:${humanized[2]}`;
  }
  return time;
}

function pad(value: number): string {
  return value < 10 ? "0" + value : String(value);
}
