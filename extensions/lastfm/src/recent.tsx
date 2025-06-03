import React from "react";
import { ActionPanel, showToast, getPreferenceValues, List, Grid, Icon, Toast, Action } from "@raycast/api";
import type { ItemProps, Track } from "@/types";
import { useRecentTracks } from "./lib/use-lastfm";
import { generateMusicServiceAction, getCoverUrlsBySize } from "./lib/utils";
import { GridResults } from "./components/grid";
import { ListResults } from "./components/list";

export const procesSongItem = (track: Track, idx: number): ItemProps => {
  const { view } = getPreferenceValues();
  const covers = getCoverUrlsBySize(track.image);
  const nowPlaying = track["@attr"]?.nowplaying || false;

  return {
    key: `${track.name}-${idx}`,
    title: track.name,
    subtitle: track.artist ? `by ${track.artist["#text"]}` : undefined,
    cover: view == "grid" ? covers.large : covers.small,
    accessories: [{ text: nowPlaying ? `Now Playing` : null }],
    accessory: { icon: nowPlaying ? Icon.Play : null },
    actions: (
      <ActionPanel>
        <ActionPanel.Section title="Open And Search">
          <Action.OpenInBrowser url={track.url} title="Open on Last.fm" />
          {generateMusicServiceAction({ term: `${track.artist["#text"]} - ${track.name}`, type: "song" }).map(
            (service: { url: string; label: string }) => {
              return <Action.OpenInBrowser url={service.url} title={service.label} />;
            }
          )}
        </ActionPanel.Section>
        <ActionPanel.Section title="Copy">
          <Action.CopyToClipboard
            title="Copy URL to Clipboard"
            content={track.url}
            shortcut={{ modifiers: ["ctrl"], key: "u" }}
          />
          <Action.CopyToClipboard
            title="Copy Name and Artist"
            content={`${track.name} - ${track.artist["#text"]}`}
            shortcut={{ modifiers: ["ctrl"], key: "a" }}
          />
        </ActionPanel.Section>
      </ActionPanel>
    ),
  };
};

const RecentTracks: React.FC = () => {
  const { view } = getPreferenceValues();
  const { loading, error, songs } = useRecentTracks();

  if (error !== null) {
    showToast(Toast.Style.Failure, "Something went wrong.", String(error));
  }

  const data = songs.map(procesSongItem);

  if (view == "grid") {
    return (
      <Grid
        isLoading={loading}
        searchBarPlaceholder="Search songs..."
        aspectRatio="3/4"
        columns={4}
        fit={Grid.Fit.Contain}
      >
        <GridResults items={data} />;
      </Grid>
    );
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search songs...">
      <ListResults items={data} />;
    </List>
  );
};

export default RecentTracks;
