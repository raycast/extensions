import { Action, ActionPanel, Detail, List, Image } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState, useRef } from "react";
import { getCurrentTrack, TrackInfo } from "./utils/applescript";
import { getLyrics, LrcLibTrack, parseLrc, LrcLine } from "./utils/lrclib";
import { getArtwork } from "./utils/artwork";

export default function Command() {
  const {
    data: currentTrack,
    isLoading: isLoadingTrack,
    revalidate: revalidateTrack,
  } = usePromise(getCurrentTrack);

  const { data: trackLyrics, isLoading: isLoadingLyrics } = usePromise(
    async (track: TrackInfo | null) => {
      if (!track) return null;
      return getLyrics(track.name, track.artist, track.album, track.duration);
    },
    [currentTrack ?? null],
    { execute: !!currentTrack },
  );

  const { data: artworkUrl } = usePromise(
    async (track: TrackInfo | null) => {
      if (!track) return null;
      if (track.artwork_url) return track.artwork_url;
      return getArtwork(`${track.artist} ${track.album}`);
    },
    [currentTrack ?? null],
    { execute: !!currentTrack },
  );

  if (isLoadingTrack) {
    return <List isLoading={true} />;
  }

  if (currentTrack) {
    return (
      <LyricsView
        track={currentTrack}
        lyrics={trackLyrics}
        artwork={artworkUrl}
        isLoading={isLoadingLyrics}
        onRefresh={revalidateTrack}
      />
    );
  }

  return (
    <List>
      <List.EmptyView
        icon="🎵"
        title="No music playing"
        description="Start playing music on Spotify or Apple Music to see lyrics."
      />
    </List>
  );
}

function LyricsView({
  track,
  lyrics,
  artwork,
  isLoading,
  onRefresh,
}: {
  track: TrackInfo;
  lyrics: LrcLibTrack | null | undefined;
  artwork: string | null | undefined;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const [currentPosition, setCurrentPosition] = useState(track.position);
  const [parsedLyrics, setParsedLyrics] = useState<LrcLine[]>([]);
  const prevPositionRef = useRef(track.position);

  // Poll for seeks every 2 seconds
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const currentTrackData = await getCurrentTrack();
      if (!currentTrackData) return;

      const positionDiff = Math.abs(
        currentTrackData.position - prevPositionRef.current,
      );

      // Detect seek (position jump > 6 seconds)
      if (positionDiff > 6) {
        console.log("Seek detected:", positionDiff, "seconds");
        prevPositionRef.current = currentTrackData.position;
        setCurrentPosition(currentTrackData.position);
      } else {
        // Normal playback - just update prev position for next comparison
        prevPositionRef.current = currentTrackData.position;
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, []);

  // Update position when track prop changes (from refresh)
  useEffect(() => {
    setCurrentPosition(track.position);
    prevPositionRef.current = track.position;
  }, [track.name, track.artist, track.position]);

  // Parse lyrics when available
  useEffect(() => {
    if (lyrics?.syncedLyrics) {
      setParsedLyrics(parseLrc(lyrics.syncedLyrics));
    } else if (lyrics?.plainLyrics) {
      // Create fake synced lyrics for plain text so we can use the same list structure
      const lines = lyrics.plainLyrics
        .split("\n")
        .map((text) => ({
          time: 0,
          text: text.trim(),
        }))
        .filter((line) => line.text.length > 0);
      setParsedLyrics(lines);
    } else {
      setParsedLyrics([]);
    }
  }, [lyrics]);

  // Timer to increment position
  useEffect(() => {
    if (track.state !== "playing") return;

    const interval = setInterval(() => {
      setCurrentPosition((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [track.state]);

  // Find current line index
  const currentLineIndex = parsedLyrics.findIndex((line) => {
    const nextLine = parsedLyrics[parsedLyrics.indexOf(line) + 1];
    return (
      line.time <= currentPosition &&
      (!nextLine || nextLine.time > currentPosition)
    );
  });

  const currentLine =
    currentLineIndex !== -1 ? parsedLyrics[currentLineIndex] : null;
  const nextLine =
    currentLineIndex !== -1 && currentLineIndex + 1 < parsedLyrics.length
      ? parsedLyrics[currentLineIndex + 1]
      : null;
  const prevLine =
    currentLineIndex > 0 ? parsedLyrics[currentLineIndex - 1] : null;

  let markdown = "";
  const verticalSpacing = "\n\n\n\n\n\n";

  if (isLoading) {
    markdown = "Loading lyrics...";
  } else if (!lyrics) {
    markdown = `## ${track.name} - ${track.artist}\n\n*Lyrics not found*`;
  } else if (parsedLyrics.length > 0) {
    markdown += verticalSpacing;
    if (prevLine) markdown += `# ${prevLine.text}\n\n`;
    markdown += `# ${currentLine?.text || "..."}\n\n`;
    if (nextLine) markdown += `# ${nextLine.text}`;
  } else {
    markdown = `## ${track.name} - ${track.artist}\n\n${lyrics.plainLyrics || "*Instrumental*"}`;
  }

  const albumArtIcon: Image.ImageLike | undefined = artwork
    ? { source: artwork }
    : undefined;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Album art" icon={albumArtIcon} />
          <Detail.Metadata.Label title="Track" text={track.name} />
          <Detail.Metadata.Label title="Artist" text={track.artist} />
          <Detail.Metadata.Label title="Album" text={track.album} />
          <Detail.Metadata.Label title="Source" text={track.app} />
          <Detail.Metadata.Label
            title="Time"
            text={`${formatTime(currentPosition)} / ${formatTime(track.duration)}`}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
