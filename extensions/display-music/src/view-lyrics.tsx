import { Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getNowPlaying } from "./apple-music";
import { fetchLyrics } from "./lyrics";

export default function ViewLyrics() {
  const [markdown, setMarkdown] = useState<string>("Loading lyrics...");
  const [trackName, setTrackName] = useState<string>("");
  const [artistName, setArtistName] = useState<string>("");
  const [albumName, setAlbumName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { track } = await getNowPlaying();

        if (!track) {
          setMarkdown(
            "## Nothing playing\n\nPlay a song in Apple Music to view its lyrics.",
          );
          setIsLoading(false);
          return;
        }

        setTrackName(track.name);
        setArtistName(track.artist);
        setAlbumName(track.album);

        const result = await fetchLyrics(track.name, track.artist, track.album);

        const lyrics = result.plainLyrics;

        if (!lyrics) {
          setMarkdown("*No lyrics found for this track.*");
        } else {
          const formattedLyrics = lyrics
            .split("\n")
            .map((line: string) => (line.trim() === "" ? "\n&nbsp;\n" : line))
            .join("  \n");

          setMarkdown(formattedLyrics);
        }
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load lyrics",
        });
        setMarkdown("## Error\n\nCould not fetch lyrics. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      metadata={
        trackName ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Track" text={trackName} />
            <Detail.Metadata.Label title="Artist" text={artistName} />
            <Detail.Metadata.Label title="Album" text={albumName} />
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}
