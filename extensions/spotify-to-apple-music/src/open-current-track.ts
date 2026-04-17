import { Clipboard, getPreferenceValues, open, showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import {
  findAppleMusicUrl,
  shouldOpenInMusicApp,
  type SpotifyTrack,
} from "./apple-music.js";

const SEPARATOR = "\u001f";

type CommandPreferences = {
  countryCode?: string;
};

export default async function command() {
  try {
    const track = await getCurrentSpotifyTrack();
    await Clipboard.copy(track.uri);
    const appleMusicUrl = await findAppleMusicUrl(track, getCountryCode());
    await open(
      appleMusicUrl,
      shouldOpenInMusicApp(appleMusicUrl) ? "Music" : undefined,
    );
    await showHUD("Opened in Apple Music");
  } catch (error) {
    await showHUD(
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : "Something went wrong.",
    );
  }
}

async function getCurrentSpotifyTrack(): Promise<SpotifyTrack> {
  const output = await runAppleScript(`
    if application "Spotify" is not running then error "Spotify is not running."

    tell application "Spotify"
      if player state is stopped then error "Spotify is not currently on a track."

      return (id of current track) & (ASCII character 31) & (name of current track) & (ASCII character 31) & (artist of current track)
    end tell
  `);

  const [uri = "", name = "", artist = ""] = output
    .split(SEPARATOR)
    .map((value) => value.trim());

  if (!uri || !name || !artist) {
    throw new Error("Spotify didn't return enough track details.");
  }

  return { uri, name, artist };
}

async function runAppleScript(script: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    execFile("/usr/bin/osascript", ["-e", script], (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr.trim() || error.message));
        return;
      }

      resolve(stdout.trim());
    });
  });
}

function getCountryCode(): string {
  const preferences = getPreferenceValues<CommandPreferences>();
  const countryCode = preferences.countryCode?.trim().toUpperCase();

  return countryCode?.match(/^[A-Z]{2}$/) ? countryCode : "US";
}
