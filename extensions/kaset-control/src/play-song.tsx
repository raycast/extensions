import {
  Action,
  ActionPanel,
  Icon,
  LaunchProps,
  List,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import {
  addToQueue,
  mergeSearchResults,
  playVideo,
  playYouTubeVideo,
  searchYouTube,
  searchYouTubeMusic,
  type SearchResult,
  type SongResult,
  type VideoResult,
} from "./utils/kaset";

type Source = "both" | "ytmusic" | "youtube";

interface PlaySongLaunchContext {
  mode?: "play" | "add";
}

export default function PlaySong(
  props: LaunchProps<{ launchContext: PlaySongLaunchContext }>,
) {
  const addMode = props.launchContext?.mode === "add";
  const [searchText, setSearchText] = useState("");
  const [source, setSource] = useState<Source>(
    () => getPreferenceValues<Preferences>().searchSource ?? "both",
  );
  const query = searchText.trim();

  const { data, isLoading, revalidate } = usePromise(
    async (q: string, src: Source) => {
      if (!q) return { query: q, source: src, results: [] as SearchResult[] };

      let results: SearchResult[];
      if (src === "youtube") {
        results = await searchYouTube(q);
      } else if (src === "ytmusic") {
        results = await searchYouTubeMusic(q);
      } else {
        const [songs, videos] = await Promise.allSettled([
          searchYouTubeMusic(q),
          searchYouTube(q),
        ]);
        if (songs.status === "rejected" && videos.status === "rejected") {
          throw songs.reason;
        }
        results = mergeSearchResults(
          songs.status === "fulfilled" ? songs.value : [],
          videos.status === "fulfilled" ? videos.value : [],
        );
      }

      return { query: q, source: src, results };
    },
    [query, source],
    {
      onError: async () => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Search temporarily unavailable",
          message: "The search request failed. Please try again.",
        });
      },
    },
  );

  const settled =
    data?.query === query && data?.source === source && !isLoading;
  const results = useMemo(
    () => (settled ? (data?.results ?? []) : []),
    [data, settled],
  );
  const hasQuery = query.length > 0;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search songs and videos"
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Source"
          value={source}
          onChange={(value) => setSource(value as Source)}
        >
          <List.Dropdown.Item
            title="YouTube Music + YouTube"
            value="both"
            icon={Icon.Music}
          />
          <List.Dropdown.Item
            title="YouTube Music"
            value="ytmusic"
            icon={Icon.Music}
          />
          <List.Dropdown.Item
            title="YouTube"
            value="youtube"
            icon={Icon.Video}
          />
        </List.Dropdown>
      }
      throttle
    >
      {!hasQuery ? (
        <List.EmptyView
          title="Search for a song"
          description="Type a title, artist, or keywords to search."
        />
      ) : !settled ? (
        <List.EmptyView
          title="Searching..."
          description={`Looking for "${query}".`}
        />
      ) : results.length === 0 ? (
        <List.EmptyView
          title="No results found"
          description="Try a different query or source."
          actions={
            <ActionPanel>
              <Action
                title="Retry Search"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : (
        results.map((result) => (
          <ResultItem key={result.id} result={result} addMode={addMode} />
        ))
      )}
    </List>
  );
}

function ResultItem({
  result,
  addMode,
}: {
  result: SearchResult;
  addMode: boolean;
}) {
  const isVideo = result.source === "youtube";
  const song = result as SongResult;
  const video = result as VideoResult;

  const subtitle = isVideo
    ? video.channel
    : [song.artist, song.album].filter(Boolean).join(" • ");

  const play = (
    <Action
      title={isVideo ? "Play Video" : "Play Song"}
      icon={Icon.Play}
      onAction={() =>
        isVideo ? playYouTubeVideo(result.id) : playVideo(result.id)
      }
    />
  );

  const addToQueueAction = (
    <Action
      title="Add to Queue"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "q" }}
      onAction={() => addToQueue([result.id])}
    />
  );

  const playNextAction = (
    <Action
      title="Play Next"
      icon={Icon.Forward}
      shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
      onAction={() => addToQueue([result.id], true)}
    />
  );

  const copyLinkAction = (
    <Action.CopyToClipboard
      title="Copy Link"
      icon={Icon.Link}
      content={`https://youtu.be/${result.id}`}
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
    />
  );

  return (
    <List.Item
      title={result.title}
      subtitle={subtitle}
      icon={result.artworkURL || (isVideo ? Icon.Video : Icon.Music)}
      accessories={result.duration ? [{ text: result.duration }] : undefined}
      actions={
        <ActionPanel>
          {addMode ? addToQueueAction : play}
          {addMode ? play : addToQueueAction}
          <ActionPanel.Section title="Queue">
            {playNextAction}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            {copyLinkAction}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
