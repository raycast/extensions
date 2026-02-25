import { Action, ActionPanel, Detail, LaunchType, launchCommand } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import AlbumBioView from "./album-bio";
import { formatNowPlayingAlbumSearchQuery, inspectNowPlayingForLookup } from "./media-control";

type AlbumResult = {
  id?: number;
  name?: string;
  url?: string;
  artist?: {
    name?: string;
  };
};

type AlbumHit = {
  result?: AlbumResult;
};

type SearchSections = {
  hits?: AlbumHit[];
};

type QueryResponse = {
  response?: {
    hits?: AlbumHit[];
    sections?: SearchSections[];
  };
};

function readStringField(payload: unknown, key: string): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getAlbumResults(data: QueryResponse | undefined): AlbumResult[] {
  const directHits = (data?.response?.hits || []).map((hit) => hit.result).filter(Boolean) as AlbumResult[];
  if (directHits.length > 0) {
    return directHits;
  }
  const sectionHits = (data?.response?.sections || []).flatMap((section) => section.hits || []);
  return sectionHits.map((hit) => hit.result).filter(Boolean) as AlbumResult[];
}

function pickBestAlbumResult(
  results: AlbumResult[],
  targetAlbumName: string,
  targetArtistName: string,
): AlbumResult | undefined {
  const normalizedTargetAlbum = normalize(targetAlbumName);
  const normalizedTargetArtist = normalize(targetArtistName);
  let best: { result: AlbumResult; score: number } | undefined;

  for (const result of results) {
    const candidateAlbum = result.name || "";
    if (!candidateAlbum || !result.id) {
      continue;
    }

    const normalizedCandidateAlbum = normalize(candidateAlbum);
    const normalizedCandidateArtist = normalize(result.artist?.name || "");
    let score = 0;

    if (normalizedCandidateAlbum === normalizedTargetAlbum) {
      score += 100;
    } else if (
      normalizedTargetAlbum &&
      (normalizedCandidateAlbum.includes(normalizedTargetAlbum) ||
        normalizedTargetAlbum.includes(normalizedCandidateAlbum))
    ) {
      score += 60;
    }

    if (normalizedTargetArtist && normalizedCandidateArtist === normalizedTargetArtist) {
      score += 20;
    }

    if (!best || score > best.score) {
      best = { result, score };
    }
  }

  return best && best.score > 0 ? best.result : undefined;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isDetectingTrack, setIsDetectingTrack] = useState(process.platform === "darwin");
  const [trackDetectionError, setTrackDetectionError] = useState<string | null>(null);
  const [isMediaControlMissing, setIsMediaControlMissing] = useState(false);
  const [isMediaControlInstalled, setIsMediaControlInstalled] = useState(false);
  const [targetAlbumName, setTargetAlbumName] = useState("");
  const [targetArtistName, setTargetArtistName] = useState("");

  async function refreshDetection() {
    setIsDetectingTrack(true);
    const info = await inspectNowPlayingForLookup("album");
    const albumQuery = formatNowPlayingAlbumSearchQuery(info.payload);
    const albumName = readStringField(info.payload, "album");
    const artistName = readStringField(info.payload, "artist");

    if (albumQuery) {
      setSearchText(albumQuery);
      setTargetAlbumName(albumName);
      setTargetArtistName(artistName);
      setTrackDetectionError(null);
      setIsMediaControlMissing(false);
      setIsMediaControlInstalled(false);
    } else if (info.isNotInstalled) {
      setSearchText("");
      setTargetAlbumName("");
      setTargetArtistName("");
      setTrackDetectionError(info.error || "No now-playing track detected");
      setIsMediaControlMissing(true);
      setIsMediaControlInstalled(false);
    } else {
      setSearchText("");
      setTargetAlbumName("");
      setTargetArtistName("");
      setTrackDetectionError(info.error || null);
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
    `https://genius.com/api/search/albums?q=${encodeURIComponent(searchText)}`,
    { keepPreviousData: true, execute: searchText.length > 0 },
  );
  const results = getAlbumResults(data);
  const matchedResult = pickBestAlbumResult(results, targetAlbumName, targetArtistName);
  const fallbackResult = results.find((result) => result.id);
  const selectedResult = matchedResult || fallbackResult;
  const albumId = selectedResult?.id;
  const albumName = selectedResult?.name;

  if (isDetectingTrack || isLoading) {
    return <Detail isLoading markdown="Searching Genius.com for current album info..." />;
  }

  if (albumId) {
    return (
      <AlbumBioView
        albumId={albumId}
        title={albumName}
        preferredManualQuery={[targetAlbumName, targetArtistName].filter(Boolean).join(" ").trim() || searchText}
      />
    );
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
              title="Search Album Manually"
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={async () => {
                await launchCommand({
                  name: "manual-album-bio-search",
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
          "Start playback and refresh to fetch the album info.",
        ].join("\n")}
        actions={
          <ActionPanel>
            <Action title="Refresh Media-Control Check" onAction={refreshDetection} />
            <Action
              title="Search Album Manually"
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={async () => {
                await launchCommand({
                  name: "manual-album-bio-search",
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
      : selectedResult
        ? `No album info metadata found for:\n\n\`${targetAlbumName || selectedResult.name || searchText}\``
        : `No Genius.com result found for:\n\n\`${searchText}\``;

  return (
    <Detail
      markdown={failureMessage}
      actions={
        <ActionPanel>
          <Action title="Refresh Media-Control Check" onAction={refreshDetection} />
          <Action
            title="Search Album Manually"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={async () => {
              await launchCommand({
                name: "manual-album-bio-search",
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
