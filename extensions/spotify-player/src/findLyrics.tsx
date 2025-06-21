import React, { useState, useEffect } from "react";
import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";
import { TrackObject } from "./helpers/spotify.api";

// Import genius-lyrics with fallback
let GeniusClient: typeof import("genius-lyrics").Client | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Genius = require("genius-lyrics");
  GeniusClient = Genius.Client || Genius.default?.Client || Genius;
} catch (error) {
  console.error("Failed to import genius-lyrics:", error);
}

// Component to show lyrics for the currently playing song
export default function FindLyricsCommand() {
  const [lyrics, setLyrics] = useState<string>("");
  const [songInfo, setSongInfo] = useState<{ title: string; artist: string; album?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchCurrentSongLyrics = async () => {
      try {
        setIsLoading(true);
        setError("");

        // Set up Spotify client
        await setSpotifyClient();

        // Get currently playing track
        const currentlyPlayingData = await getCurrentlyPlaying();

        if (!currentlyPlayingData) {
          setError("Unable to get playback information from Spotify");
          return;
        }

        if (!currentlyPlayingData.item) {
          setError("Nothing is currently playing on Spotify");
          return;
        }

        const { item } = currentlyPlayingData;
        const isTrack = currentlyPlayingData.currently_playing_type !== "episode";

        if (!isTrack) {
          setError("Lyrics are only available for music tracks, not podcasts or episodes");
          return;
        }

        const track = item as TrackObject;
        const songTitle = track.name;
        const artistName = track.artists?.[0]?.name;

        if (!songTitle || !artistName) {
          setError("Could not get song information from the currently playing track");
          return;
        }

        // Set song info
        setSongInfo({
          title: songTitle,
          artist: artistName,
          album: track.album?.name,
        });

        // Now fetch lyrics using the exact same logic from search-lyrics.tsx
        let lyricsFound = false;

        // Try Genius first
        try {
          console.log(`🔍 Searching Genius for: "${songTitle}" by "${artistName}"`);
          if (GeniusClient) {
            const client = new GeniusClient();
            const searchResults = await client.songs.search(`${songTitle} ${artistName}`);

            if (searchResults && searchResults.length > 0) {
              // Find the best match (exact title match preferred)
              let bestMatch = searchResults[0];
              for (const result of searchResults) {
                if (
                  result.title.toLowerCase() === songTitle.toLowerCase() &&
                  result.artist.name.toLowerCase() === artistName.toLowerCase()
                ) {
                  bestMatch = result;
                  break;
                }
              }

              console.log(`🎯 Found match: "${bestMatch.title}" by "${bestMatch.artist.name}"`);
              const lyricsText = await bestMatch.lyrics();
              if (lyricsText && lyricsText.trim() !== "") {
                setLyrics(lyricsText);
                lyricsFound = true;
                console.log("✅ Using Genius lyrics from search");
              }
            }
          }
        } catch (geniusError) {
          console.log("Genius lyrics not available, trying alternatives...", geniusError);
        }

        // If Genius fails, show simple error
        if (!lyricsFound) {
          setError(`Oops! Lyrics not available for "${songTitle}" by ${artistName}`);
        }
      } catch (err: unknown) {
        console.error("Error fetching lyrics:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch lyrics. Please try again.";
        setError(errorMessage);
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
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
    const formattedLyrics = lyrics
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .join("\n\n"); // Each line gets double line breaks for proper verse spacing

    return `# ${songInfo?.title}\n\n**Artist:** ${songInfo?.artist}\n\n${songInfo?.album ? `**Album:** ${songInfo.album}\n\n` : ""}---\n\n${formattedLyrics}`;
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
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Song Info"
                  content={`${songInfo.title} by ${songInfo.artist}`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </>
            )}
            <Action.OpenInBrowser
              title="Search Web for Lyrics"
              url={`https://www.google.com/search?q=${encodeURIComponent(`${songInfo.title} ${songInfo.artist} lyrics`)}`}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
