import { Action, ActionPanel, Detail, LaunchType, launchCommand } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import ArtistBioView from "./artist-bio";
import { inspectNowPlayingForLookup } from "./media-control";

type QueryResponse = {
  response: {
    hits: Hit[];
  };
};

type Hit = {
  result: {
    full_title?: string;
    primary_artist?: {
      id?: number;
      name?: string;
    };
  };
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isDetectingTrack, setIsDetectingTrack] = useState(process.platform === "darwin");
  const [trackDetectionError, setTrackDetectionError] = useState<string | null>(null);
  const [isMediaControlMissing, setIsMediaControlMissing] = useState(false);
  const [isMediaControlInstalled, setIsMediaControlInstalled] = useState(false);

  async function refreshDetection() {
    setIsDetectingTrack(true);
    const info = await inspectNowPlayingForLookup("artist");
    if (info.query) {
      setSearchText(info.query);
      setTrackDetectionError(null);
      setIsMediaControlMissing(false);
      setIsMediaControlInstalled(false);
    } else if (info.isNotInstalled) {
      setTrackDetectionError(info.error || "No now-playing track detected");
      setIsMediaControlMissing(true);
      setIsMediaControlInstalled(false);
    } else {
      setTrackDetectionError(info.error || "No now-playing track detected");
      setIsMediaControlMissing(false);
      setIsMediaControlInstalled(true);
    }
    setIsDetectingTrack(false);
  }

  useEffect(() => {
    if (process.platform !== "darwin") {
      setIsDetectingTrack(false);
      return;
    }
    void refreshDetection();
  }, []);

  const { data, isLoading } = useFetch<QueryResponse>(
    `https://genius.com/api/search?q=${encodeURIComponent(searchText)}`,
    { keepPreviousData: true, execute: searchText.length > 0 },
  );
  const topHit = data?.response?.hits?.[0]?.result;
  const artistId = topHit?.primary_artist?.id;
  const artistName = topHit?.primary_artist?.name;

  if (isDetectingTrack || isLoading) {
    return <Detail isLoading markdown="Searching Genius.com for current artist info..." />;
  }

  if (artistId) {
    return <ArtistBioView artistId={artistId} name={artistName} preferredManualQuery={artistName || searchText} />;
  }

  if (isMediaControlMissing) {
    return (
      <Detail
        markdown={[
          "# Install `media-control`",
          "",
          "MusicSeer needs `media-control` to auto-detect the currently playing track on macOS.",
          "",
          "Install with Homebrew:",
          "```bash",
          "brew install media-control",
          "```",
        ].join("\n")}
        actions={
          <ActionPanel>
            <Action title="Refresh Media-Control Check" onAction={refreshDetection} />
            <Action
              title="Search Artist Manually"
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={async () => {
                await launchCommand({
                  name: "manual-artist-bio-search",
                  type: LaunchType.UserInitiated,
                  arguments: { query: searchText },
                });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (isMediaControlInstalled && searchText.length === 0) {
    return (
      <Detail
        markdown={[
          "# `media-control` is installed",
          "",
          "No active track was detected right now.",
          "Start playback and refresh to fetch the artist info.",
        ].join("\n")}
        actions={
          <ActionPanel>
            <Action title="Refresh Media-Control Check" onAction={refreshDetection} />
            <Action
              title="Search Artist Manually"
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={async () => {
                await launchCommand({
                  name: "manual-artist-bio-search",
                  type: LaunchType.UserInitiated,
                  arguments: { query: searchText },
                });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  const failureMessage =
    searchText.length === 0
      ? `Unable to detect a current track.\n\n${trackDetectionError ? `Error: \`${trackDetectionError}\`` : ""}`
      : topHit
        ? `No artist info metadata found for:\n\n\`${topHit.full_title || searchText}\``
        : `No Genius.com result found for:\n\n\`${searchText}\``;

  return (
    <Detail
      markdown={failureMessage}
      actions={
        <ActionPanel>
          <Action title="Refresh Media-Control Check" onAction={refreshDetection} />
          <Action
            title="Search Artist Manually"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={async () => {
              await launchCommand({
                name: "manual-artist-bio-search",
                type: LaunchType.UserInitiated,
                arguments: { query: searchText },
              });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
