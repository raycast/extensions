import React, { useState, useEffect } from "react";
import { Action, ActionPanel, Detail } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";
import { findLyrics } from "./api/lyrics";
import cleanupSongTitle from "./helpers/cleanupSongTitle";
import type { TrackObject } from "./helpers/spotify.api";

type SongInfo = {
  title: string;
  artist: string;
  album: string;
  duration: number;
};

async function getCurrentSong(): Promise<SongInfo> {
  await setSpotifyClient();

  const currentlyPlayingData = await getCurrentlyPlaying();

  if (!currentlyPlayingData) {
    throw new Error("Unable to get playback information from Spotify");
  }

  if (!currentlyPlayingData.item) {
    throw new Error("Nothing is currently playing on Spotify");
  }

  if (currentlyPlayingData.currently_playing_type === "episode") {
    throw new Error("Lyrics are only available for music tracks, not podcasts or episodes");
  }

  const track = currentlyPlayingData.item as TrackObject;
  const title = track.name;
  const artist = track.artists?.[0]?.name;
  const album = track.album?.name;
  const duration = track.duration_ms ? Math.round(track.duration_ms / 1000) : undefined;

  if (!title || !artist || !album || !duration) {
    throw new Error("Could not get song information from the currently playing track");
  }

  return { title, artist, album, duration };
}

export default function FindLyricsCommand() {
  const [lyrics, setLyrics] = useState<string>("");
  const [songInfo, setSongInfo] = useState<SongInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchCurrentSongLyrics = async () => {
      try {
        setIsLoading(true);
        setError("");

        const currentSong = await getCurrentSong();
        setSongInfo(currentSong);

        const lyricsResult = await findLyrics({
          title: cleanupSongTitle(currentSong.title),
          artist: currentSong.artist,
          album: currentSong.album,
          duration: currentSong.duration,
        });

        if (lyricsResult.lyrics?.trim()) {
          setLyrics(lyricsResult.lyrics);
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
      return `# Error\n\n${error}\n\n## Tips:\n- Try searching for a different version of the song\n- Check if the song is available on LRCLIB\n- Some songs may not have lyrics available`;
    }

    if (!lyrics) {
      return `# Loading lyrics for "${songInfo?.title || "current song"}"\n\nPlease wait while we fetch the lyrics...`;
    }

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
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
