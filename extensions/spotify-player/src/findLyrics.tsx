import React, { useState, useEffect } from "react";
import { Action, ActionPanel, Detail } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";
import { searchGeniusLyrics } from "./api/geniusLyrics";
import cleanupSongTitle from "./helpers/cleanupSongTitle";
import type { TrackObject } from "./helpers/spotify.api";

type SongInfo = { title: string; artist: string; album?: string };

// Function to clean up Genius lyrics by removing metadata
function cleanGeniusLyrics(rawLyrics: string): string {
  if (!rawLyrics) return "";

  let cleaned = rawLyrics;

  // Remove contributor count (e.g., "1629 Contributors")
  cleaned = cleaned.replace(/^\d+\s+Contributors?/i, "");

  // Remove translations list (languages like Türkçe, Português, etc.)
  cleaned = cleaned.replace(/Translations?[^[]+/i, "");

  // Remove song description/annotation that appears before lyrics
  // This typically starts with quotes and ends with "Read More" or similar
  cleaned = cleaned.replace(/"[^"]*"\s+is\s+[^"]*[.…]\s*(?:Read More\s*)?/i, "");

  // Remove any remaining metadata before the first bracket (like [Intro], [Verse 1], etc.)
  const firstBracketIndex = cleaned.search(/\[/);
  if (firstBracketIndex > 0) {
    const beforeBracket = cleaned.substring(0, firstBracketIndex).trim();
    // If there's a lot of text before the first bracket, it's likely metadata
    if (beforeBracket.length > 100 || beforeBracket.includes("Lyrics")) {
      cleaned = cleaned.substring(firstBracketIndex);
    }
  }

  // Clean up extra whitespace and normalize line breaks
  cleaned = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n") // Max 2 consecutive newlines
    .trim();

  return cleaned;
}

async function getCurrentSongFromSpotifyApp(): Promise<SongInfo | undefined> {
  const separator = "<<<RAYCAST_SPOTIFY_LYRICS_SEPARATOR>>>";
  const script = `
    if application "Spotify" is not running then
      return "NOT_RUNNING"
    end if

    tell application "Spotify"
      if player state is stopped then
        return "NOT_PLAYING"
      end if

      set currentTrack to current track
      set trackName to name of currentTrack
      set artistName to artist of currentTrack
      set albumName to album of currentTrack

      return trackName & "${separator}" & artistName & "${separator}" & albumName
    end tell
  `;
  const response = await runAppleScript(script);

  if (response === "NOT_RUNNING") {
    return undefined;
  }

  if (response === "NOT_PLAYING") {
    return undefined;
  }

  const [title, artist, album] = response.split(separator).map((value) => value.trim());

  if (!title || !artist) {
    throw new Error("Could not get song information from Spotify Desktop");
  }

  return {
    title,
    artist,
    album: album || undefined,
  };
}

async function getCurrentSongFromSpotifyApi(): Promise<SongInfo> {
  await setSpotifyClient();

  const currentlyPlayingData = await getCurrentlyPlaying();

  if (!currentlyPlayingData) {
    throw new Error("Unable to get playback information from Spotify");
  }

  if (!currentlyPlayingData.item) {
    throw new Error("Nothing is currently playing on Spotify");
  }

  const { item } = currentlyPlayingData;
  const isTrack = currentlyPlayingData.currently_playing_type !== "episode";

  if (!isTrack) {
    throw new Error("Lyrics are only available for music tracks, not podcasts or episodes");
  }

  const track = item as TrackObject;
  const title = track.name;
  const artist = track.artists
    ?.map((artist) => artist.name)
    .filter(Boolean)
    .join(", ");

  if (!title || !artist) {
    throw new Error("Could not get song information from the currently playing track");
  }

  return {
    title,
    artist,
    album: track.album?.name,
  };
}

async function getCurrentSong(): Promise<SongInfo> {
  try {
    const spotifyAppSong = await getCurrentSongFromSpotifyApp();

    if (spotifyAppSong) {
      return spotifyAppSong;
    }
  } catch (error) {
    console.error("Unable to read current song from Spotify Desktop:", error);
  }

  return await getCurrentSongFromSpotifyApi();
}

// Component to show lyrics for the currently playing song
export default function FindLyricsCommand() {
  const [lyrics, setLyrics] = useState<string>("");
  const [songInfo, setSongInfo] = useState<SongInfo | null>(null);
  const [lyricsUrl, setLyricsUrl] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchCurrentSongLyrics = async () => {
      try {
        setIsLoading(true);
        setError("");

        const currentSong = await getCurrentSong();

        setSongInfo(currentSong);

        const lyricsResult = await searchGeniusLyrics(cleanupSongTitle(currentSong.title), currentSong.artist);

        if (lyricsResult.lyrics?.trim()) {
          setLyrics(cleanGeniusLyrics(lyricsResult.lyrics));
          setLyricsUrl(lyricsResult.url);
          return;
        }

        setError(`Oops! Lyrics not available for "${currentSong.title}" by ${currentSong.artist}`);
      } catch (err: unknown) {
        console.error("Error fetching lyrics:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch lyrics. Please try again.";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentSongLyrics();
  }, []);

  const markdown = () => {
    if (error) {
      return `# Error\n\n${error}\n\n## Tips:\n- Try searching for a different version of the song\n- Check if the song is available on Genius\n- Some songs may not have lyrics available`;
    }

    if (!lyrics) {
      return `# Loading lyrics for "${songInfo?.title || "current song"}"\n\nPlease wait while we fetch the lyrics...`;
    }

    // Format lyrics EXACTLY like search-lyrics.tsx
    return `# ${songInfo?.title}\n\n**Artist:** ${songInfo?.artist}\n\n${songInfo?.album ? `**Album:** ${songInfo.album}\n\n` : ""}---\n\n${lyrics
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .join("\n\n")}`;
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown()}
      navigationTitle={songInfo ? `${songInfo.title} - ${songInfo.artist}` : "Find Lyrics"}
      actions={
        songInfo ? (
          <ActionPanel>
            {lyrics && (
              <>
                <Action.CopyToClipboard
                  title="Copy Lyrics"
                  content={lyrics}
                  shortcut={{ macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } }}
                />
                <Action.CopyToClipboard
                  title="Copy Song Info"
                  content={`${songInfo.title} by ${songInfo.artist}`}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "c" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                  }}
                />
              </>
            )}
            <Action.OpenInBrowser
              title="Search Web for Lyrics"
              url={`https://www.google.com/search?q=${encodeURIComponent(`${songInfo.title} ${songInfo.artist} lyrics`)}`}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "s" }, Windows: { modifiers: ["ctrl"], key: "s" } }}
            />
            {lyricsUrl && <Action.OpenInBrowser title="Open on Genius" url={lyricsUrl} />}
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
