import React, { useState } from "react";
import { ActionPanel, showToast, Toast, getPreferenceValues, List, Grid, Action } from "@raycast/api";

// Hooks
import { useTopAlbums } from "./hooks/useTopAlbums";

// Types
import type { Album } from "@/types/AlbumResponse";
import { periodTypes } from "./types";
import { PeriodDropdown } from "./components/period";
import { ListResults } from "./components/list";
import { GridResults } from "./components/grid";
import { generateMusicServiceAction } from "./lib/utils";
import type { ItemProps } from "./types";

interface AlbumItemProps {
  key: string;
  title: string;
  subtitle?: string;
  icon?: string;
  content?: string;
  accessories?: Array<{ text: string | null }>;
  accessory?: { tooltip: string };
  actions: React.ReactNode;
}

export const processAlbumItem = (album: Album, idx: number): AlbumItemProps => {
  const { view } = getPreferenceValues();
  const image = album.image?.find((img) => img.size === "large")?.["#text"] || "";
  const { url, name } = album.artist;

  return {
    key: `${album.name}-${idx}`,
    title: album.name,
    subtitle: name ? `by ${name}` : undefined,
    icon: view === "list" ? image : undefined,
    content: view === "grid" ? image : undefined,
    accessories: [{ text: album.playcount ? `${album.playcount} plays` : null }],
    accessory: album.playcount ? { tooltip: album.playcount } : undefined,
    actions: (
      <ActionPanel>
        <ActionPanel.Section title="Open And Search">
          <Action.OpenInBrowser url={album.url} title="Open on Last.fm" />
          {url && <Action.OpenInBrowser url={url} title="Open Artist Page on Last.fm" />}
          {generateMusicServiceAction({ term: `${name} - ${album.name}`, type: "album" }).map((service) => (
            <Action.OpenInBrowser key={service.url} url={service.url} title={service.label} />
          ))}
        </ActionPanel.Section>
        <ActionPanel.Section title="Copy">
          <Action.CopyToClipboard title="Copy URL to Clipboard" content={album.url} />
          <Action.CopyToClipboard title="Copy Album Name to Clipboard" content={album.name} />
          {name && <Action.CopyToClipboard title="Copy Artist Name to Clipboard" content={name} />}
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

  const data = albums.map((album, idx) => processAlbumItem(album as Album, idx));

  if (view === "grid") {
    return (
      <Grid
        isLoading={loading}
        searchBarPlaceholder="Search albums..."
        searchBarAccessory={<PeriodDropdown selectedPeriod={period} onPeriodChange={onPeriodChange} />}
      >
        <GridResults items={data} />
      </Grid>
    );
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search albums..."
      searchBarAccessory={<PeriodDropdown selectedPeriod={period} onPeriodChange={onPeriodChange} />}
    >
      <ListResults items={data} />
    </List>
  );
};

export default TopAlbums;
