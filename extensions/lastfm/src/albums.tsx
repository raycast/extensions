import React, { useState } from "react";
import { ActionPanel, showToast, getPreferenceValues, List, Toast, Action, Grid } from "@raycast/api";
import { Album, ItemProps, periodTypes } from "./types";
import { useTopAlbums } from "./lib/use-lastfm";
import { PeriodDropdown } from "./components/period";
import { ListResults } from "./components/list";
import { generateMusicServiceAction, getCoverUrlsBySize } from "./lib/utils";
import { GridResults } from "./components/grid";

export const processAlbumItem = (album: Album, idx: number): ItemProps => {
  const { view } = getPreferenceValues();
  const covers = getCoverUrlsBySize(album.image);

  return {
    key: `${album.name}-${idx}`, // not quite uniq
    title: album.name,
    subtitle: album.artist ? `by ${album.artist.name}` : undefined,
    cover: view === "grid" ? covers.large : covers.small,
    accessories: [{ text: album.playcount ? `${album.playcount} plays` : undefined }],
    accessory: album.playcount ? { tooltip: album.playcount } : undefined,
    actions: (
      <ActionPanel>
        <ActionPanel.Section title="Open And Search">
          <Action.OpenInBrowser url={album.url} title="Open on Last.fm" />
          {album.artist.url && <Action.OpenInBrowser url={album.artist.url} title="Open Artist Page on Last.fm" />}
          {generateMusicServiceAction({ term: `${album.artist.name} - ${album.name}`, type: "album" }).map(
            (service: { url: string; label: string }) => {
              return <Action.OpenInBrowser url={service.url} title={service.label} />;
            },
          )}
        </ActionPanel.Section>
        <ActionPanel.Section title="Copy">
          <Action.CopyToClipboard title="Copy URL to Clipboard" content={album.url} />
          <Action.CopyToClipboard title="Copy Album Name to Clipboard" content={album.name} />
          {album.artist.name && (
            <Action.CopyToClipboard title="Copy Artist Name to Clipboard" content={album.artist.name} />
          )}
        </ActionPanel.Section>
      </ActionPanel>
    ),
  };
};

const TopAlbums: React.FC = () => {
  const { period: defaultPeriod, view } = getPreferenceValues();
  const [period, setPeriod] = useState<periodTypes>(defaultPeriod);
  const { loading, error, albums, revalidate } = useTopAlbums({ period });

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

  const data = albums.map(processAlbumItem);

  if (view == "grid") {
    return (
      <Grid
        isLoading={loading}
        searchBarPlaceholder="Search album..."
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
      searchBarPlaceholder="Search album..."
      searchBarAccessory={<PeriodDropdown selectedPeriod={period} onPeriodChange={onPeriodChange} />}
    >
      <ListResults items={data} />
    </List>
  );
};

export default TopAlbums;
