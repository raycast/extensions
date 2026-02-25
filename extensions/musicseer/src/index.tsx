import { ActionPanel, List, Action, Icon, Detail, LaunchType, launchCommand } from "@raycast/api";
import { useFetch, useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";
import Lyrics from "./Lyrics";
import History, { HistoryItem } from "./History";
import { inspectNowPlayingForLookup } from "./media-control";

type QueryResponse = {
  response: {
    hits: Hit[];
  };
};

type Hit = {
  result: {
    id?: number;
    full_title: string;
    song_art_image_thumbnail_url: string;
    url: string;
  };
};

export default function Command() {
  const initialQuery = "";
  const autoMode = process.platform === "darwin";
  const [searchText, setSearchText] = useState(initialQuery);
  const [isDetectingTrack, setIsDetectingTrack] = useState(autoMode);
  const [trackDetectionError, setTrackDetectionError] = useState<string | null>(null);
  const [isMediaControlMissing, setIsMediaControlMissing] = useState(false);
  const [isMediaControlInstalled, setIsMediaControlInstalled] = useState(false);

  useEffect(() => {
    if (!autoMode) {
      return;
    }

    let cancelled = false;

    async function detectTrack() {
      setIsDetectingTrack(true);
      const info = await inspectNowPlayingForLookup("track");
      if (cancelled) {
        return;
      }
      if (info.query) {
        setSearchText(info.query);
        setTrackDetectionError(null);
        setIsMediaControlMissing(false);
        setIsMediaControlInstalled(false);
      } else {
        setTrackDetectionError(info.error || "No now-playing track detected");
        setIsMediaControlMissing(info.isNotInstalled);
        setIsMediaControlInstalled(false);
      }
      setIsDetectingTrack(false);
    }

    void detectTrack();

    return () => {
      cancelled = true;
    };
  }, [autoMode]);

  const { data, isLoading } = useFetch<QueryResponse>(
    `https://genius.com/api/search?q=${encodeURIComponent(searchText)}`,
    {
      keepPreviousData: true,
      execute: searchText.length > 0,
    },
  );
  const {
    value: history,
    setValue: setHistory,
    isLoading: isHistoryLoading,
  } = useLocalStorage<HistoryItem[]>("history", []);
  const topHit = data?.response.hits?.[0]?.result;

  if (autoMode) {
    if (isDetectingTrack || isLoading || isHistoryLoading) {
      return <Detail isLoading markdown="Searching Genius.com using your currently playing track..." />;
    }

    if (topHit) {
      return <Lyrics url={topHit.url} title={topHit.full_title} songId={topHit.id} preferredManualQuery={searchText} />;
    }

    if (isMediaControlMissing) {
      return (
        <Detail
          markdown={[
            "# Install `media-control`",
            "",
            "MusicSeer needs `media-control` to auto-detect the currently playing track on macOS.",
            "",
            "Official install method:",
            "```bash",
            "brew install media-control",
            "```",
            "",
            "Other option (advanced): build from source from the upstream project:",
            "https://github.com/ungive/media-control",
          ].join("\n")}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Media-Control Check"
                onAction={async () => {
                  setIsDetectingTrack(true);
                  const info = await inspectNowPlayingForLookup("track");
                  if (info.query) {
                    setSearchText(info.query);
                    setTrackDetectionError(null);
                    setIsMediaControlMissing(false);
                    setIsMediaControlInstalled(true);
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
                }}
              />
              <Action
                title="Search Track Manually"
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                onAction={async () => {
                  await launchCommand({
                    name: "manual-search",
                    type: LaunchType.UserInitiated,
                    arguments: {
                      query: searchText,
                    },
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
            "MusicSeer can access `media-control` successfully.",
            "",
            "No active track was detected right now. Start playback and run refresh again.",
          ].join("\n")}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Media-Control Check"
                onAction={async () => {
                  setIsDetectingTrack(true);
                  const info = await inspectNowPlayingForLookup("track");
                  if (info.query) {
                    setSearchText(info.query);
                    setTrackDetectionError(null);
                    setIsMediaControlMissing(false);
                    setIsMediaControlInstalled(true);
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
                }}
              />
              <Action
                title="Search Track Manually"
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                onAction={async () => {
                  await launchCommand({
                    name: "manual-search",
                    type: LaunchType.UserInitiated,
                    arguments: {
                      query: searchText,
                    },
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
        : `No Genius.com result found for:\n\n\`${searchText}\``;

    return (
      <Detail
        markdown={failureMessage}
        actions={
          <ActionPanel>
            <Action
              title="Search Track Manually"
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={async () => {
                await launchCommand({
                  name: "manual-search",
                  type: LaunchType.UserInitiated,
                  arguments: {
                    query: searchText,
                  },
                });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading || isHistoryLoading || isDetectingTrack}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter title (or auto-detect from now playing)..."
      throttle
    >
      {searchText.length === 0 ? (
        <History />
      ) : (
        <>
          {(data?.response.hits || []).map((item, idx) => (
            <List.Item
              key={idx}
              title={item.result.full_title}
              icon={item.result.song_art_image_thumbnail_url}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Lyrics"
                    icon={Icon.Paragraph}
                    target={
                      <Lyrics
                        url={item.result.url}
                        title={item.result.full_title}
                        songId={item.result.id}
                        preferredManualQuery={searchText}
                      />
                    }
                    onPush={() => {
                      const existingIdx = history!.findIndex(
                        (i) => i.title.toLowerCase() === item.result.full_title.toLowerCase(),
                      );
                      if (existingIdx !== -1) {
                        history![existingIdx] = {
                          ...history![existingIdx],
                          viewedAt: Date.now(),
                          songId: item.result.id,
                        };
                        setHistory(history!);
                      } else {
                        setHistory(
                          history?.concat({
                            title: item.result.full_title,
                            thumbnail: item.result.song_art_image_thumbnail_url,
                            url: item.result.url,
                            viewedAt: Date.now(),
                            songId: item.result.id,
                          }) || [],
                        );
                      }
                    }}
                  />
                  <Action.OpenInBrowser title="Open in Browser" url={item.result.url} />
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}
