import React, { useState } from "react";
import { ActionPanel, showToast, getPreferenceValues, List, Toast, Action, Grid } from "@raycast/api";
import { Artist, ItemProps, periodTypes } from "./types";
import { useTopArtists } from "./lib/use-lastfm";
import { PeriodDropdown } from "./components/period";
import { ListResults } from "./components/list";
import { generateMusicServiceAction, getCoverUrlsBySize } from "./lib/utils";
import { GridResults } from "./components/grid";

export const procesArtistItem = (artist: Artist, idx: number): ItemProps => {
  const { view } = getPreferenceValues();
  const covers = getCoverUrlsBySize(artist.image);

  return {
    key: `${artist.name}-${idx}`, // not quite uniq
    title: artist.name,
    subtitle: undefined,
    cover: view == "grid" ? covers.large : covers.small,
    accessories: [{ text: artist.playcount ? `${artist.playcount} plays` : null }],
    accessory: artist.playcount ? { tooltip: artist.playcount } : undefined,
    actions: (
      <ActionPanel>
        <ActionPanel.Section title="Open And Search">
          <Action.OpenInBrowser url={artist.url} title="Open on Last.fm" />
          {generateMusicServiceAction({ term: `${artist.name}`, type: "artist" }).map(
            (service: { url: string; label: string }) => {
              return <Action.OpenInBrowser url={service.url} title={service.label} />;
            }
          )}
        </ActionPanel.Section>
        <ActionPanel.Section title="Copy">
          <Action.CopyToClipboard title="Copy URL to Clipboard" content={artist.url} />
          <Action.CopyToClipboard title="Copy Artist Name" content={artist.name} />
        </ActionPanel.Section>
      </ActionPanel>
    ),
  };
};

const TopArtists: React.FC = () => {
  const { period: defaultPeriod, view } = getPreferenceValues();
  const [period, setPeriod] = useState<periodTypes>(defaultPeriod);
  const { loading, error, artists, revalidate } = useTopArtists({ period });

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

  const data = artists.map(procesArtistItem);

  if (view == "grid") {
    return (
      <Grid
        isLoading={loading}
        searchBarPlaceholder="Search artist..."
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
      searchBarPlaceholder="Search artist..."
      searchBarAccessory={<PeriodDropdown selectedPeriod={period} onPeriodChange={onPeriodChange} />}
    >
      <ListResults items={data} />
    </List>
  );
};

export default TopArtists;
