import React, { useState } from "react";
import { ActionPanel, showToast, getPreferenceValues, List, Toast, Action, Grid } from "@raycast/api";
import { ItemProps, periodTypes, TopTrack } from "./types";
import { useTopTracks } from "./lib/use-lastfm";
import { PeriodDropdown } from "./components/period";
import { ListResults } from "./components/list";
import { generateMusicServiceAction, getCoverUrlsBySize } from "./lib/utils";
import { GridResults } from "./components/grid";

export const procesSongItem = (track: TopTrack, idx: number): ItemProps => {
  const { view } = getPreferenceValues();
  const covers = getCoverUrlsBySize(track.image);

  return {
    key: `${track.name}-${idx}`, // not quite uniq
    title: track.name,
    subtitle: track.artist ? `by ${track.artist.name}` : undefined,
    cover: view == "grid" ? covers.large : covers.small,
    accessories: [{ text: track.playcount ? `${track.playcount} plays` : null }],
    accessory: track.playcount ? { tooltip: track.playcount } : undefined,
    actions: (
      <ActionPanel>
        <ActionPanel.Section title="Open And Search">
          <Action.OpenInBrowser url={track.url} title="Open on Last.fm" />
          {generateMusicServiceAction({ term: `${track.artist.name} - ${track.name}`, type: "song" }).map(
            (service: { url: string; label: string }) => {
              return <Action.OpenInBrowser url={service.url} title={service.label} />;
            }
          )}
        </ActionPanel.Section>
        <ActionPanel.Section title="Copy">
          <Action.CopyToClipboard title="Copy URL to Clipboard" content={track.url} />
          <Action.CopyToClipboard title="Copy Name and Artist" content={`${track.artist.name} - ${track.name}`} />
        </ActionPanel.Section>
      </ActionPanel>
    ),
  };
};

const TopSongs: React.FC = () => {
  const { period: defaultPeriod, view } = getPreferenceValues();
  const [period, setPeriod] = useState<periodTypes>(defaultPeriod);
  const { loading, error, songs, revalidate } = useTopTracks({ period });

  if (error !== null) {
    showToast(Toast.Style.Failure, "Something went wrong.", String(error));
    return (
      <List isLoading={false}>
        <List.EmptyView title="Something went wrong" description={String(error)} />
      </List>
    );
  }

  function onPeriodChange(value: string) {
    setPeriod(value as periodTypes);
    revalidate();
  }

  const data = songs.map(procesSongItem);

  if (view === "grid") {
    return (
      <Grid
        isLoading={loading}
        searchBarPlaceholder="Search songs..."
        searchBarAccessory={<PeriodDropdown selectedPeriod={period} onPeriodChange={onPeriodChange} />}
        aspectRatio="3/4"
        columns={4}
        fit={Grid.Fit.Contain}
      >
        <GridResults items={data} />
      </Grid>
    );
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search songs..."
      searchBarAccessory={<PeriodDropdown selectedPeriod={period} onPeriodChange={onPeriodChange} />}
    >
      <ListResults items={data} />
    </List>
  );
};

export default TopSongs;
